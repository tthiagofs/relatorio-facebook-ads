let accessToken = '';  // Armazena o token de acesso do Facebook

// Função de login com o Facebook
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

document.getElementById('form').addEventListener('submit', function(event) {
    event.preventDefault();  // Impede o recarregamento da página

    const unitId = document.getElementById('unitId').value;
    if (!unitId) {
        alert('Por favor, selecione uma unidade.');
        return;
    }

    fetchCampaignData(unitId);
});
