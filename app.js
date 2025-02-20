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

// Função para alternar telas
function showScreen(screen) {
    appLoginScreen.style.display = 'none';
    reportSelectionScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    mainContent.style.display = 'none';
    screen.style.display = 'block';
}

// Login do app
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

// Seleção de relatório simplificado
simpleReportBtn.addEventListener('click', () => {
    showScreen(loginScreen);
});

// Login com Facebook (lógica original do seu app)
loginBtn.addEventListener('click', () => {
    FB.login(function(response) {
        if (response.authResponse) {
            showScreen(mainContent);
            FB.api('/me/adaccounts', function(response) {
                const unitSelect = document.getElementById('unitId');
                unitSelect.innerHTML = '<option value="">Escolha a unidade</option>';
                response.data.forEach(account => {
                    const option = document.createElement('option');
                    option.value = account.id;
                    option.text = account.name; // Nome correto das contas
                    unitSelect.appendChild(option);
                });
            });
        } else {
            document.getElementById('loginError').textContent = 'Login cancelado ou falhou.';
            document.getElementById('loginError').style.display = 'block';
        }
    }, {scope: 'ads_read'});
});

// Geração do relatório (lógica restaurada do seu app.js original)
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const unitId = document.getElementById('unitId').value;
    const unitName = document.getElementById('unitId').options[document.getElementById('unitId').selectedIndex].text; // Nome correto da unidade
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    FB.api(
        `/${unitId}/insights`,
        {
            fields: 'spend,actions,reach',
            time_range: { since: startDate, until: endDate }
        },
        function(response) {
            const reportData = response.data[0];
            const spend = reportData.spend;
            const actions = reportData.actions;
            const reach = reportData.reach;
            let conversations = 0;

            actions.forEach(action => {
                if (action.action_type === 'messaging_conversation_started_7d') {
                    conversations = action.value;
                }
            });

            const costPerConversation = (spend / conversations).toFixed(2);

            const startDateFormatted = startDate.split('-').reverse().join('/');
            const endDateFormatted = endDate.split('-').reverse().join('/');

            reportContainer.innerHTML = `
                📊 RELATÓRIO - CA - ${unitName}
                📅 Período: ${startDateFormatted} a ${endDateFormatted}
                💰 Investimento: R$ ${parseFloat(spend).toFixed(2).replace('.', ',')}
                💬 Mensagens iniciadas: ${conversations}
                💵 Custo por mensagem: R$ ${costPerConversation.replace('.', ',')}
                📢 Alcance: ${parseInt(reach).toLocaleString('pt-BR')} pessoas
            `.replace(/\n/g, '<br>');
            shareWhatsAppBtn.style.display = 'block';
        }
    );
});

// Compartilhar no WhatsApp (já corrigido anteriormente)
shareWhatsAppBtn.addEventListener('click', () => {
    const reportText = reportContainer.innerText;
    const encodedText = encodeURIComponent(reportText);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
});

// Mostrar tela inicial
showScreen(appLoginScreen);