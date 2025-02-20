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

// Login com Facebook (lógica original)
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

// Geração do relatório (corrigido com a variável correta)
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const unitId = document.getElementById('unitId').value;
    const unitName = document.getElementById('unitId').options[document.getElementById('unitId').selectedIndex].text; // Nome correto
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
                const reportData = response.data[0];
                const spend = reportData.spend || '0';
                const actions = reportData.actions || [];
                const reach = reportData.reach || '0';

                // Busca a ação correta: onsite_conversion.messaging_conversation_started_7d
                let conversations = 0;
                actions.forEach(action => {
                    if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                        conversations = action.value;
                    }
                });

                // Custo por mensagem (investimento / mensagens iniciadas)
                const costPerConversation = conversations > 0 ? (spend / conversations).toFixed(2) : '0';

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
            } else {
                reportContainer.innerHTML = '<p>Erro ao gerar relatório ou sem dados para o período.</p>';
            }
        }
    );
});

// Compartilhar no WhatsApp
shareWhatsAppBtn.addEventListener('click', () => {
    const reportText = reportContainer.innerText;
    const encodedText = encodeURIComponent(reportText);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
});

// Mostrar tela inicial
showScreen(appLoginScreen);