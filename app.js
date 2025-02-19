// Função para validar o login
document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const login = document.getElementById('login').value;
    const password = document.getElementById('password').value;

    // Validação simples (substitua por uma lógica segura no ambiente de produção)
    if (login === "@admin" && password === "134679") {
        // Login bem-sucedido
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
    } else {
        // Login falhou
        document.getElementById('loginError').textContent = "E-mail ou senha incorretos.";
        document.getElementById('loginError').style.display = 'block';
    }
});

// Restante do seu código (funções do Facebook e geração de relatórios)
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

// ... (restante do seu código)