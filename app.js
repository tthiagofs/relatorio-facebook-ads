let accessToken = '';  // Armazena o token de acesso do Facebook

function loginWithFacebook() {
    FB.login(function(response) {
        if (response.authResponse) {
            console.log('Usuário autenticado', response.authResponse);
            accessToken = response.authResponse.accessToken;
            console.log('Token de Acesso:', accessToken);

            fetchAdAccounts();

            document.getElementById('form').style.display = 'block';
            document.getElementById('loginBtn').style.display = 'none';
        } else {
            console.log('Usuário cancelou o login');
        }
    }, { scope: 'ads_read,ads_management' });
}

function fetchAdAccounts() {
    if (!accessToken) {
        alert("Por favor, faça login no Facebook primeiro.");
        return;
    }

    const url = `https://graph.facebook.com/v12.0/me/adaccounts?fields=id,name&access_token=${accessToken}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log('Dados recebidos:', data);
            if (data && data.data && data.data.length > 0) {
                const adAccounts = data.data;
                const unitSelect = document.getElementById('unitId');

                unitSelect.innerHTML = '<option value="">Escolha a unidade</option>';

                adAccounts.forEach(account => {
                    const option = document.createElement('option');
                    option.value = account.id;
                    option.textContent = account.name || `Conta ${account.id}`;
                    unitSelect.appendChild(option);
                });
            } else {
                alert("Nenhuma conta de anúncio encontrada para o usuário.");
            }
        })
        .catch(error => {
            console.error("Erro ao buscar contas de anúncio:", error);
            alert("Erro ao buscar as contas de anúncio. Tente novamente.");
        });
}

function fetchCampaignData(unitId) {
    if (!accessToken) {
        alert("Por favor, faça login no Facebook primeiro.");
        return;
    }

    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    const url = `https://graph.facebook.com/v12.0/${unitId}/insights?access_token=${accessToken}&time_range={\"since\":\"${startDate}\",\"until\":\"${endDate}\"}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log('Dados recebidos:', data);
            if (data && data.data && data.data.length > 0) {
                const campaignData = data.data[0];
                const reportData = {
                    unitName: unitId,
                    startDate: startDate,
                    endDate: endDate,
                    campaignName: campaignData.campaign_name || 'Campanha Desconhecida',
                    spent: campaignData.spend || '0,00',
                    messages: campaignData.messaging_conversion || 0,
                    cpc: campaignData.cost_per_messaging_conversion || '0,00',
                    reach: campaignData.reach || 0
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
    if (!unitId) {
        alert('Por favor, selecione uma unidade.');
        return;
    }
    fetchCampaignData(unitId);
});
