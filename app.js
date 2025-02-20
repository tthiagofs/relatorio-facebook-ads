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

// Login com Facebook (lógica original restaurada)
loginBtn.addEventListener('click', () => {
    FB.login(function(response) {
        if (response.authResponse) {
            showScreen(mainContent);
            FB.api('/me/adaccounts', function(response) {
                if (response && !response.error) {
                    const unitSelect = document.getElementById('unitId');
                    response.data.forEach(account => {
                        const option = document.createElement('option');
                        option.value = account.id;
                        option.text = account.name;
                        unitSelect.appendChild(option);
                    });
                }
            });
        } else {
            document.getElementById('loginError').textContent = 'Login cancelado ou falhou.';
            document.getElementById('loginError').style.display = 'block';
        }
    }, {scope: 'ads_read'});
});

// Geração do relatório (lógica original mantida)
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const unitId = document.getElementById('unitId').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    FB.api(
        `/${unitId}/insights`,
        {
            fields: 'spend,actions,reach',
            time_range: { since: startDate, until: endDate },
            level: 'account'
        },
        function(response) {
            if (response && !response.error && response.data.length > 0) {
                const data = response.data[0];
                const spend = data.spend || '0';
                const messages = data.actions ? data.actions.find(action => action.action_type === 'conversation')?.value || '0' : '0';
                const reach = data.reach || '0';
                const costPerMessage = messages > 0 ? (spend / messages).toFixed(2) : '0';

                const reportHTML = `
                    📊 RELATÓRIO - CA - ${document.getElementById('unitId').selectedOptions[0].text}
                    📅 Período: ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}
                    💰 Investimento: R$ ${parseFloat(spend).toFixed(2).replace('.', ',')}
                    💬 Mensagens iniciadas: ${messages}
                    💵 Custo por mensagem: R$ ${costPerMessage.replace('.', ',')}
                    📢 Alcance: ${parseInt(reach).toLocaleString('pt-BR')} pessoas
                `;
                reportContainer.innerHTML = reportHTML.replace(/\n/g, '<br>');
                shareWhatsAppBtn.style.display = 'block';
            } else {
                reportContainer.innerHTML = '<p>Erro ao gerar relatório ou sem dados para o período.</p>';
            }
        }
    );
});

// Compartilhar no WhatsApp (lógica original)
shareWhatsAppBtn.addEventListener('click', () => {
    const reportText = reportContainer.innerText;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(reportText)}`;
    window.open(whatsappUrl, '_blank');
});

// Mostrar tela inicial
showScreen(appLoginScreen);