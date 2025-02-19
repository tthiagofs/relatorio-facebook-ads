let accessToken = '';  // Armazena o token de acesso do Facebook
let adAccountsMap = {};  // Armazena os nomes das contas

// Função para fazer login com o Facebook
function loginWithFacebook() {
    FB.login(function(response) {
        if (response.authResponse) {
            accessToken = response.authResponse.accessToken;
            fetchAdAccounts();
            document.getElementById('form').style.display = 'block';
            document.getElementById('loginBtn').style.display = 'none';
        } else {
            console.error("Erro ao autenticar no Facebook.");
        }
    }, { scope: 'ads_read,ads_management' });
}

// Função para buscar as contas de anúncios
function fetchAdAccounts() {
    if (!accessToken) {
        console.error("Token de acesso não encontrado.");
        return;
    }

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
            } else {
                console.error("Nenhuma conta de anúncios encontrada.");
            }
        })
        .catch(error => console.error('Erro ao buscar contas de anúncios:', error));
}

// Função para buscar dados da campanha
function fetchCampaignData(unitId) {
    if (!accessToken) {
        console.error("Token de acesso não encontrado.");
        return;
    }
    
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        alert("Por favor, selecione o período para análise.");
        return;
    }

    const url = `https://graph.facebook.com/v18.0/${unitId}/insights?fields=campaign_name,spend,reach,actions&access_token=${accessToken}&time_range=${encodeURIComponent(JSON.stringify({since: startDate, until: endDate}))}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (!data || !data.data || data.data.length === 0) {
                console.error("Nenhum dado de campanha encontrado.");
                alert("Nenhum dado encontrado para esse período.");
                return;
            }

            const campaignData = data.data[0] || {};
            const actions = campaignData.actions || [];
            const messages = actions.find(action => action.action_type === 'onsite_conversion.messaging_conversation_started_7d')?.value || 0;
            const spent = parseFloat(campaignData.spend) || 0;
            const cpc = messages > 0 ? (spent / messages) : 0;

            const reportData = {
                unitName: adAccountsMap[unitId] || unitId,
                startDate: formatarData(startDate),
                endDate: formatarData(endDate),
                campaignName: campaignData.campaign_name || 'Campanha Desconhecida',
                spent: formatarNumero(spent),
                messages: messages.toLocaleString('pt-BR'),
                cpc: formatarNumero(cpc),
                reach: parseInt(campaignData.reach || 0).toLocaleString('pt-BR')
            };
            generateReport(reportData);
        })
        .catch(error => {
            console.error('Erro ao buscar dados:', error);
            alert("Erro ao buscar dados. Verifique a conexão e tente novamente.");
        });
}

// Função para gerar o relatório
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

// Função para formatar números
function formatarNumero(numero) {
    return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Função para formatar datas
function formatarData(data) {
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR');
}

// Evento de submit do formulário
document.getElementById('form').addEventListener('submit', function(event) {
    event.preventDefault();
    const unitId = document.getElementById('unitId').value;
    if (unitId) {
        fetchCampaignData(unitId);
    } else {
        alert("Por favor, selecione uma unidade.");
    }
});