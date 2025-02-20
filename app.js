// Elementos DOM
const appLoginScreen = document.getElementById('appLoginScreen');
const reportSelectionScreen = document.getElementById('reportSelectionScreen');
const loginScreen = document.getElementById('loginScreen');
const mainContent = document.getElementById('mainContent');
const appLoginForm = document.getElementById('appLoginForm');
const appLoginError = document.getElementById('appLoginError');
const simpleReportBtn = document.getElementById('simpleReportBtn');
const loginBtn = document.getElementById('loginBtn');
const form = document.getElementById('form');
const reportContainer = document.getElementById('reportContainer');
const shareWhatsAppBtn = document.getElementById('shareWhatsAppBtn');

// Função para mostrar/esconder telas
function showScreen(screen) {
    appLoginScreen.style.display = 'none';
    reportSelectionScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    mainContent.style.display = 'none';
    screen.style.display = 'block';
}

// Login do App
appLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === '@admin' && password === '134679') {
        showScreen(reportSelectionScreen);
    } else {
        appLoginError.textContent = 'Usuário ou senha inválidos.';
        appLoginError.style.display = 'block';
    }
});

// Seleção de Relatório Simplificado
simpleReportBtn.addEventListener('click', () => {
    showScreen(loginScreen);
});

// Login com Facebook
loginBtn.addEventListener('click', () => {
    FB.login((response) => {
        if (response.authResponse) {
            showScreen(mainContent);
            loadAdAccounts();
        } else {
            document.getElementById('loginError').textContent = 'Erro ao fazer login. Tente novamente.';
            document.getElementById('loginError').style.display = 'block';
        }
    }, { scope: 'ads_read' });
});

// Carregar contas de anúncios
function loadAdAccounts() {
    FB.api('/me/adaccounts', (response) => {
        if (response && !response.error) {
            const unitSelect = document.getElementById('unitId');
            response.data.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = account.name;
                unitSelect.appendChild(option);
            });
        } else {
            console.error('Erro ao carregar contas de anúncios:', response.error);
        }
    });
}

// Geração do relatório (mantendo o formato original)
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const unitId = document.getElementById('unitId').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    FB.api(
        `/${unitId}/insights`,
        {
            fields: 'spend,actions,reach', // Ajustado para os dados do seu exemplo
            time_range: { since: startDate, until: endDate },
            level: 'account'
        },
        (response) => {
            if (response && !response.error) {
                const data = response.data[0];
                const spend = data.spend || '0';
                const messages = data.actions ? data.actions.find(action => action.action_type === 'conversation')?.value || '0' : '0';
                const reach = data.reach || '0';
                const costPerMessage = messages > 0 ? (spend / messages).toFixed(2) : '0';

                const reportHTML = `
                    <p>📊 RELATÓRIO - CA - ${document.getElementById('unitId').selectedOptions[0].text}</p>
                    <p>📅 Período: ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}</p>
                    <p>💰 Investimento: R$ ${parseFloat(spend).toFixed(2).replace('.', ',')}</p>
                    <p>💬 Mensagens iniciadas: ${messages}</p>
                    <p>💵 Custo por mensagem: R$ ${costPerMessage.replace('.', ',')}</p>
                    <p>📢 Alcance: ${parseInt(reach).toLocaleString('pt-BR')} pessoas</p>
                `;
                reportContainer.innerHTML = reportHTML;
                shareWhatsAppBtn.style.display = 'block';
            } else {
                reportContainer.innerHTML = '<p>Erro ao gerar relatório. Verifique os dados e tente novamente.</p>';
            }
        }
    );
});

// Compartilhar no WhatsApp
shareWhatsAppBtn.addEventListener('click', () => {
    const reportText = reportContainer.innerText;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(reportText)}`;
    window.open(whatsappUrl, '_blank');
});

// Mostrar tela inicial
showScreen(appLoginScreen);