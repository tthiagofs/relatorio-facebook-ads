let accessToken = '';  // Armazena o token de acesso do Facebook

function loginWithFacebook() {
    FB.login(function(response) {
        if (response.authResponse) {
            accessToken = response.authResponse.accessToken;
            fetchAdAccounts();
            document.getElementById('form').style.display = 'block';
            document.getElementById('loginBtn').style.display = 'none';
        }
    }, { scope: 'ads_read,ads_management' });
}

function fetchAdAccounts() {
    const url = `https://graph.facebook.com/v12.0/me/adaccounts?fields=id,name&access_token=${accessToken}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.data) {
                const unitSelect = document.getElementById('unitId');
                unitSelect.innerHTML = '<option value="">Escolha a unidade</option>';
                data.data.forEach(account => {
                    const option = document.createElement('option');
                    option.value = account.id;
                    option.textContent = account.name;
                    unitSelect.appendChild(option);
                });
            }
        });
}

function fetchCampaignData(unitId) {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const url = `https://graph.facebook.com/v12.0/${unitId}/insights?access_token=${accessToken}&time_range=${encodeURIComponent(JSON.stringify({since: startDate, until: endDate}))}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log('Dados recebidos da API:', data);
            const campaignData = data.data && data.data.length > 0 ? data.data[0] : {};
            const reportData = {
                unitName: unitId,
                startDate,
                endDate,
                campaignName: campaignData.campaign_name || 'Campanha Desconhecida',
                spent: campaignData.spend || '0,00',
                messages: campaignData.messaging_conversions || 0,
                cpc: campaignData.cost_per_messaging_conversion || '0,00',
                reach: campaignData.reach || 0
            };
            generateReport(reportData);
        })
        .catch(error => {
            console.error('Erro ao buscar dados:', error);
        });
}

function generateReport(data) {
    const reportContainer = document.getElementById('reportContainer');
    reportContainer.innerHTML = `
        <h2>📊 RELATÓRIO - UNIDADE ${data.unitName}</h2>
        <p><strong>Período analisado:</strong> ${data.startDate} a ${data.endDate}</p>
        <p><strong>Campanha:</strong> ${data.campaignName}</p>
        <p>💰 <strong>Investimento:</strong> R$ ${data.spent}</p>
        <p>💬 <strong>Mensagens iniciadas:</strong> ${data.messages}</p>
        <p>💵 <strong>Custo por mensagem:</strong> R$ ${data.cpc}</p>
        <p>📢 <strong>Alcance:</strong> ${data.reach} pessoas</p>
    `;
}

document.getElementById('form').addEventListener('submit', function(event) {
    event.preventDefault();
    const unitId = document.getElementById('unitId').value;
    if (unitId) fetchCampaignData(unitId);
});
