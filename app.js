let accessToken = '';  // Armazena o token de acesso do Facebook
let adAccountsMap = {};  // Armazena os nomes das contas

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
                    adAccountsMap[account.id] = account.name;
                    const option = document.createElement('option');
                    option.value = account.id;
                    option.textContent = account.name;
                    unitSelect.appendChild(option);
                });
            }
        });
}

function formatarNumero(numero) {
    return parseFloat(numero).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarData(data) {
    const partes = data.split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function fetchCampaignData(unitId) {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const campaignFilter = document.getElementById('campaignFilter').value.toLowerCase(); // Novo filtro
    const url = `https://graph.facebook.com/v12.0/${unitId}/insights?fields=campaign_name,spend,reach,actions&access_token=${accessToken}&time_range=${encodeURIComponent(JSON.stringify({since: startDate, until: endDate}))}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log('Dados recebidos da API:', data);
            const filteredData = data.data ? data.data.filter(item => campaignFilter === '' || item.campaign_name.toLowerCase().includes(campaignFilter)) : [];

            const campaignData = filteredData.length > 0 ? filteredData[0] : {};
            const actions = campaignData.actions || [];
            const messages = actions.find(action => action.action_type === 'onsite_conversion.messaging_conversation_started_7d')?.value || 0;
            const spent = parseFloat(campaignData.spend) || 0;
            const cpc = messages > 0 ? (spent / messages) : 0;

            const reportData = {
                unitName: adAccountsMap[unitId] || unitId,
                startDate: formatarData(startDate),
                endDate: formatarData(endDate),
                campaignName: campaignData.campaign_name || 'Nenhuma campanha encontrada',
                spent: formatarNumero(spent),
                messages: messages.toLocaleString('pt-BR'),
                cpc: formatarNumero(cpc),
                reach: parseInt(campaignData.reach || 0).toLocaleString('pt-BR')
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
        <h2>📊 RELATÓRIO - ${data.unitName}</h2>
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
