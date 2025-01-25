let accessToken = ''; // Armazena o token de acesso do Facebook

// Função de login com o Facebook
function loginWithFacebook() {
    FB.login(function(response) {
        if (response.authResponse) {
            console.log('Usuário autenticado', response.authResponse);
            accessToken = response.authResponse.accessToken;
            console.log('Token de Acesso:', accessToken);

            // Ativar a seleção do formulário após login
            document.getElementById('form').style.display = 'block';
        } else {
            console.log('Usuário cancelou o login');
        }
    }, { scope: 'ads_read,ads_management' }); // Permissões necessárias
}

// Função para gerar o relatório com os dados da campanha
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

// Função para buscar dados das campanhas
function fetchCampaignData(unitId) {
    if (!accessToken) {
        alert("Por favor, faça login no Facebook primeiro.");
        return;
    }

    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    const url = `https://graph.facebook.com/v12.0/${unitId}/insights?access_token=${accessToken}&time_range={'since':'${startDate}','until':'${endDate}'}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log("Resposta da API:", data); // Verificar os dados retornados

            if (data && data.data && data.data.length > 0) {
                const campaignData = data.data[0];

                const reach = campaignData.reach || 0;
                const messagesStarted = campaignData['onsite_conversion.messaging_conversation_started_7d'] || 0;
                const spent = campaignData.spend || 0;
                const costPerMessage = messagesStarted > 0 ? (spent / messagesStarted).toFixed(2) : 'N/A';

                const reportData = {
                    unitName: unitId,
                    startDate,
                    endDate,
                    campaignName: campaignData.campaign_name || 'Sem nome',
                    spent: spent.toFixed(2),
                    messages: messagesStarted,
                    cpc: costPerMessage,
                    reach: reach
                };

                generateReport(reportData);
            } else {
                alert('Nenhum dado encontrado para esse período.');
            }
        })
        .catch(error => {
            console.error('Erro ao buscar dados da campanha:', error);
            alert('Ocorreu um erro ao buscar os dados da campanha. Tente novamente.');
        });
}
// Função para lidar com o envio do formulário
document.getElementById('form').addEventListener('submit', function(event) {
    event.preventDefault();

    const unitId = document.getElementById('unitId').value;
    if (!unitId) {
        alert('Por favor, selecione uma unidade.');
        return;
    }

    fetchCampaignData(unitId);
});
