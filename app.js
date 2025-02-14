
// app.js
let accessToken = '';  
let adAccountsMap = {};  

function loginWithFacebook() {
    FB.login(function(response) {
        if (response.authResponse) {
            accessToken = response.authResponse.accessToken;
            fetchAdAccounts();
            document.getElementById('form').style.display = 'block';
            document.getElementById('loginBtn').style.display = 'none';
        } else {
            alert('Falha no login com o Facebook');
        }
    }, { scope: 'ads_read,ads_management' });
}

function fetchAdAccounts() {
    const url = `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name&access_token=${accessToken}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.data) {
                const unitSelect = document.getElementById('unitId');
                unitSelect.innerHTML = '<option value="">Escolha a unidade</option>';
                data.data.forEach(account => {
                    adAccountsMap[account.id] = account.name;
                    const option = document.createElement('option');
                    option.value = account.id;
                    option.textContent = account.name;
                    unitSelect.appendChild(option);
                });
            }
        })
        .catch(error => console.error('Erro ao buscar contas de anúncios:', error));
}

function fetchCampaignData(unitId) {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const url = `https://graph.facebook.com/v18.0/${unitId}/insights?fields=campaign_name,spend,reach,actions,ad_id&access_token=${accessToken}&time_range=${encodeURIComponent(JSON.stringify({since: startDate, until: endDate}))}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (!data.data || data.data.length === 0) {
                generateReport({ unitName: adAccountsMap[unitId] || unitId, startDate, endDate, campaignName: 'Sem dados', spent: '0,00', messages: '0', cpc: '0,00', reach: '0' });
                return;
            }
            const campaignData = data.data[0];
            const actions = campaignData.actions || [];
            const messages = actions.find(a => a.action_type === 'onsite_conversion.messaging_conversation_started_7d')?.value || 0;
            const spent = parseFloat(campaignData.spend) || 0;
            const cpc = messages > 0 ? (spent / messages) : 0;

            const reportData = {
                unitName: adAccountsMap[unitId] || unitId,
                startDate,
                endDate,
                campaignName: campaignData.campaign_name || 'Campanha Desconhecida',
                spent: spent.toFixed(2).replace('.', ','),
                messages: messages.toLocaleString('pt-BR'),
                cpc: cpc.toFixed(2).replace('.', ','),
                reach: parseInt(campaignData.reach || 0).toLocaleString('pt-BR'),
                unitId
            };
            openPrintableReport(reportData);
        })
        .catch(error => console.error('Erro ao buscar dados:', error));
}

function openPrintableReport(data) {
    const newWindow = window.open('', '_blank');
    newWindow.document.write(`<!DOCTYPE html>` + document.getElementById('reportTemplate').outerHTML);
    newWindow.document.close();
    newWindow.print();
}

document.getElementById('form').addEventListener('submit', function(event) {
    event.preventDefault();
    const unitId = document.getElementById('unitId').value;
    if (unitId) fetchCampaignData(unitId);
});
