# Salvando o arquivo corrigido para que o usuário possa baixá-lo
file_path = "/mnt/data/app_fixed.js"

# Ajustando o código para corrigir possíveis problemas na chamada da API do Facebook e no evento de clique do botão.
corrected_code = """let accessToken = '';  // Armazena o token de acesso do Facebook
let adAccountsMap = {};  // Armazena os nomes das contas

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

    const url = `https://graph.facebook.com/v18.0/${unitId}/insights?fields=campaign_name,spend,reach,actions,ad_id&access_token=${accessToken}&time_range=${encodeURIComponent(JSON.stringify({since: startDate, until: endDate}))}`;

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

            const topAds = data.data.sort((a, b) => {
                const aMessages = a.actions?.find(action => action.action_type === 'onsite_conversion.messaging_conversation_started_7d')?.value || 0;
                const bMessages = b.actions?.find(action => action.action_type === 'onsite_conversion.messaging_conversation_started_7d')?.value || 0;
                return bMessages - aMessages;
            }).slice(0, 2);

            let adPreviews = topAds.map(ad => `<iframe src="https://www.facebook.com/ads/library/?id=${ad.ad_id}" style="width:100%; height:500px; border:none; margin-top:20px;"></iframe>`).join('');

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
            generateReport(reportData, adPreviews);
        })
        .catch(error => {
            console.error('Erro ao buscar dados:', error);
            alert("Erro ao buscar dados. Verifique a conexão e tente novamente.");
        });
}

function generateReport(data, adPreviews = '') {
    const reportContainer = document.getElementById('reportContainer');
    reportContainer.innerHTML = `
        <h2>📊 RELATÓRIO - ${data.unitName}</h2>
        <p><strong>Período analisado:</strong> ${data.startDate} a ${data.endDate}</p>
        <p><strong>Campanha:</strong> ${data.campaignName}</p>
        <p>💰 <strong>Investimento:</strong> R$ ${data.spent}</p>
        <p>💬 <strong>Mensagens iniciadas:</strong> ${data.messages}</p>
        <p>💵 <strong>Custo por mensagem:</strong> R$ ${data.cpc}</p>
        <p>📢 <strong>Alcance:</strong> ${data.reach} pessoas</p>
        ${adPreviews}
    `;
}

document.getElementById('form').addEventListener('submit', function(event) {
    event.preventDefault();
    const unitId = document.getElementById('unitId').value;
    if (unitId) {
        fetchCampaignData(unitId);
    } else {
        alert("Por favor, selecione uma unidade.");
    }
});"""

# Salvando o código corrigido
with open(file_path, "w") as file:
    file.write(corrected_code)

# Retornando o link para download
file_path
