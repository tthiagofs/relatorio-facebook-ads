let accessToken = '';  // Armazena o token de acesso do Facebook
let adAccountsMap = {};  // Armazena os nomes das contas

// Função para validar o login
document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Validação simples (substitua por uma lógica segura no ambiente de produção)
    if (email === "usuario@exemplo.com" && password === "senha123") {
        // Login bem-sucedido
        document.getElementById('loginScreen').style.display = 'none'; // Oculta a tela de login
        document.getElementById('mainContent').style.display = 'block'; // Exibe o conteúdo principal
        document.getElementById('reportSelectionScreen').style.display = 'flex'; // Exibe a nova tela de seleção de relatório
    } else {
        // Login falhou
        document.getElementById('loginError').textContent = "E-mail ou senha incorretos.";
        document.getElementById('loginError').style.display = 'block';
    }
});

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
            console.log(data);  // Verifique o que está sendo retornado aqui
            if (data.error) {
                console.error('Erro ao buscar contas de anúncios:', data.error.message);
                alert("Erro ao buscar contas de anúncios.");
                return;
            }
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
        .catch(error => {
            console.error('Erro ao buscar contas de anúncios:', error);
            alert("Erro ao buscar contas de anúncios. Tente novamente.");
        });
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
    console.log(url);  // Verifique o valor da URL antes de fazer a requisição

    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log(data);  // Verifique o que está sendo retornado aqui
            if (data.error) {
                console.error('Erro ao buscar dados da campanha:', data.error.message);
                alert("Erro ao buscar dados da campanha.");
                return;
            }
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

    // Gera o conteúdo do relatório
    let reportHTML = `
        <h2>📊 RELATÓRIO - ${data.unitName}</h2>
        <p><strong>Período analisado:</strong> ${data.startDate} a ${data.endDate}</p>
    `;

    // Só adiciona a campanha se não for "Campanha Desconhecida"
    if (data.campaignName !== "Campanha Desconhecida") {
        reportHTML += `<p><strong>Campanha:</strong> ${data.campaignName}</p>`;
    }

    reportHTML += `
        <p>💰 <strong>Investimento:</strong> R$ ${data.spent}</p>
        <p>💬 <strong>Mensagens iniciadas:</strong> ${data.messages}</p>
        <p>💵 <strong>Custo por mensagem:</strong> R$ ${data.cpc}</p>
        <p>📢 <strong>Alcance:</strong> ${data.reach} pessoas</p>
        <button id="shareWhatsAppBtn">Compartilhar no WhatsApp</button>
    `;

    reportContainer.innerHTML = reportHTML;

    // Seleciona o botão após ser adicionado ao DOM
    const whatsappButton = document.getElementById('shareWhatsAppBtn');

    // Mensagem para o WhatsApp
    const whatsappMessage =
        `📊 RELATÓRIO - ${data.unitName}\n` +
        `📅 Período: ${data.startDate} a ${data.endDate}\n\n` +
        (data.campaignName !== "Campanha Desconhecida" ? `🎯 Campanha: ${data.campaignName}\n` : '') +
        `💰 Investimento: R$ ${data.spent}\n` +
        `💬 Mensagens iniciadas: ${data.messages}\n` +
        `💵 Custo por mensagem: R$ ${data.cpc}\n` +
        `📢 Alcance: ${data.reach} pessoas`;

    // Configura o link do WhatsApp corretamente
    whatsappButton.onclick = function () {
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(url, '_blank');
    };
}

// Função para formatar datas
function formatarData(data) {
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR');
}

// Função para formatar números
function formatarNumero(numero) {
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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