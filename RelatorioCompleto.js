const mainContent = document.getElementById('mainContent');
const form = document.getElementById('form');
const reportContainer = document.getElementById('reportContainer');
const shareWhatsAppBtn = document.getElementById('shareWhatsAppBtn');
const filterCampaignsBtn = document.getElementById('filterCampaigns');
const filterAdSetsBtn = document.getElementById('filterAdSets');
const comparePeriodsBtn = document.getElementById('comparePeriods');
const campaignsModal = document.getElementById('campaignsModal');
const adSetsModal = document.getElementById('adSetsModal');
const comparisonModal = document.getElementById('comparisonModal');
const closeCampaignsModalBtn = document.getElementById('closeCampaignsModal');
const closeAdSetsModalBtn = document.getElementById('closeAdSetsModal');
const confirmComparisonBtn = document.getElementById('confirmComparison');
const cancelComparisonBtn = document.getElementById('cancelComparison');
const actionPlanSection = document.getElementById('actionPlanSection');
const actionPlanInput = document.getElementById('actionPlanInput');
const submitActionPlanBtn = document.getElementById('submitActionPlanBtn');
const actionPlanResult = document.getElementById('actionPlanResult');
const backToReportSelectionBtn = document.getElementById('backToReportSelectionBtn');

backToReportSelectionBtn.addEventListener('click', () => {
    window.location.href = 'index.html?screen=reportSelection';
});

// Mapa para armazenar os nomes das contas, IDs dos ad sets e campanhas
const adAccountsMap = {};
const adSetsMap = {};
const campaignsMap = {};
let selectedCampaigns = new Set();
let selectedAdSets = new Set();
let isCampaignFilterActive = false;
let isAdSetFilterActive = false;
let isFilterActivated = false;
let campaignSearchText = '';
let adSetSearchText = '';
let currentAccessToken = null;
let comparisonOption = 'none';
let compareStartDate = null;
let compareEndDate = null;

// Função para carregar contas do localStorage e preencher o select
function loadAccounts() {
    const storedToken = localStorage.getItem('fbAccessToken');
    const storedAccounts = localStorage.getItem('adAccountsMap');
    if (storedToken && storedAccounts) {
        currentAccessToken = storedToken;
        const parsedAccounts = JSON.parse(storedAccounts);
        Object.assign(adAccountsMap, parsedAccounts);

        const unitSelect = document.getElementById('unitId');
        unitSelect.innerHTML = '<option value="">Escolha a unidade</option>';
        const sortedAccounts = Object.keys(adAccountsMap)
            .map(accountId => ({
                id: accountId,
                name: adAccountsMap[accountId]
            }))
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

        sortedAccounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = account.name;
            unitSelect.appendChild(option);
        });
    } else {
        window.location.href = 'index.html'; // Redireciona para login se não houver token
    }
}

// Carrega as contas ao iniciar
loadAccounts();

// Função para alternar modais
function toggleModal(modal, show, isCampaign) {
    // [Código existente de toggleModal mantido sem alterações]
}

// Função para atualizar o botão de ativação/desativação
function updateFilterButton() {
    // [Código existente de updateFilterButton mantido sem alterações]
}

// Função para renderizar opções nos modals
function renderOptions(containerId, options, selectedSet, isCampaign) {
    // [Código existente de renderOptions mantido sem alterações]
}

// Função para carregar campanhas e ad sets
form.addEventListener('input', async function(e) {
    // [Código existente mantido sem alterações]
});

// Funções para carregar campanhas e ad sets
async function loadCampaigns(unitId, startDate, endDate) {
    // [Código existente mantido sem alterações]
}

async function loadAdSets(unitId, startDate, endDate) {
    // [Código existente mantido sem alterações]
}

// Funções para obter insights
async function getCampaignInsights(campaignId, startDate, endDate) {
    // [Código existente mantido sem alterações]
}

async function getAdSetInsights(adSetId, startDate, endDate) {
    // [Código existente mantido sem alterações]
}

// Configurar eventos para os botões de filtro
filterCampaignsBtn.addEventListener('click', () => {
    // [Código existente mantido sem alterações]
});

filterAdSetsBtn.addEventListener('click', () => {
    // [Código existente mantido sem alterações]
});

closeCampaignsModalBtn.addEventListener('click', () => {
    // [Código existente mantido sem alterações]
});

closeAdSetsModalBtn.addEventListener('click', () => {
    // [Código existente mantido sem alterações]
});

comparePeriodsBtn.addEventListener('click', () => {
    comparisonModal.style.display = 'block';
});

cancelComparisonBtn.addEventListener('click', () => {
    comparisonModal.style.display = 'none';
});

confirmComparisonBtn.addEventListener('click', () => {
    const selectedOption = document.querySelector('input[name="comparisonOption"]:checked').value;
    comparisonOption = selectedOption;

    if (selectedOption === 'custom') {
        compareStartDate = document.getElementById('compareStartDate').value;
        compareEndDate = document.getElementById('compareEndDate').value;
        if (!compareStartDate || !compareEndDate) {
            alert('Por favor, preencha as datas de comparação.');
            return;
        }
    } else if (selectedOption === 'previous') {
        const startDate = new Date(document.getElementById('startDate').value);
        const endDate = new Date(document.getElementById('endDate').value);
        const periodLength = (endDate - startDate) / (1000 * 60 * 60 * 24);
        compareEndDate = new Date(startDate);
        compareEndDate.setDate(compareEndDate.getDate() - 1);
        compareStartDate = new Date(compareEndDate);
        compareStartDate.setDate(compareStartDate.getDate() - periodLength);
        compareStartDate = compareStartDate.toISOString().split('T')[0];
        compareEndDate = compareEndDate.toISOString().split('T')[0];
    } else {
        compareStartDate = null;
        compareEndDate = null;
    }
    comparisonModal.style.display = 'none';
});

// Geração do relatório
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const unitId = document.getElementById('unitId').value;
    const unitName = adAccountsMap[unitId] || 'Unidade Desconhecida';
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!unitId || !startDate || !endDate) {
        reportContainer.innerHTML = '<p>Preencha todos os campos obrigatórios (Unidade e Período).</p>';
        return;
    }

    let totalSpend = 0;
    let totalConversations = 0;
    let totalReach = 0;
    let topAds = [];

    // [Código existente para calcular métricas mantido sem alterações]

    // Após gerar o relatório, mostrar a seção do plano de ação
    reportContainer.innerHTML = `
        <div class="report-header">
            <h2>📊 Relatório Completo - ${unitName}</h2>
            <p>📅 Período: ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}</p>
        </div>
        <div class="metrics-grid">
            <div class="metric-card investment">
                <div class="metric-label">Investimento Total</div>
                <div class="metric-value">R$ ${totalSpend.toFixed(2).replace('.', ',')}</div>
            </div>
            <div class="metric-card messages">
                <div class="metric-label">Mensagens Iniciadas</div>
                <div class="metric-value">${totalConversations}</div>
            </div>
            <div class="metric-card cost">
                <div class="metric-label">Custo por Mensagem</div>
                <div class="metric-value">R$ ${(totalConversations > 0 ? totalSpend / totalConversations : 0).toFixed(2).replace('.', ',')}</div>
            </div>
            <div class="metric-card reach">
                <div class="metric-label">Alcance Total</div>
                <div class="metric-value">${totalReach.toLocaleString('pt-BR')} pessoas</div>
            </div>
        </div>
        <div class="top-ads">
            <h3>Top Anúncios</h3>
            ${topAds.map(ad => `
                <div class="top-ad-card">
                    <img src="${ad.imageUrl}" alt="Imagem do anúncio">
                    <div>
                        <div class="metric-value">${ad.name}</div>
                        <div class="metric-value">R$ ${ad.spend.toFixed(2).replace('.', ',')}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    reportContainer.classList.add('complete');
    shareWhatsAppBtn.style.display = 'block';
    actionPlanSection.style.display = 'block'; // Mostrar a seção do plano de ação
    actionPlanResult.style.display = 'none'; // Esconder o resultado até o envio
});

// Processar o plano de ação
submitActionPlanBtn.addEventListener('click', () => {
    const inputText = actionPlanInput.value.trim();
    if (!inputText) {
        alert('Por favor, insira um plano de ação.');
        return;
    }

    // Dividir o texto em itens da lista (cada linha é um item)
    const actionItems = inputText.split('\n').filter(item => item.trim() !== '');

    // Gerar a lista formatada
    actionPlanResult.innerHTML = `
        <h3>Plano de Ação:</h3>
        <ul>
            ${actionItems.map(item => `<li>${item}</li>`).join('')}
        </ul>
    `;
    actionPlanResult.style.display = 'block'; // Mostrar o resultado
    actionPlanSection.style.display = 'none'; // Esconder a seção de entrada
});

// Compartilhar no WhatsApp
shareWhatsAppBtn.addEventListener('click', () => {
    const reportText = reportContainer.innerText + (actionPlanResult.style.display === 'block' ? '\n\n' + actionPlanResult.innerText : '');
    const encodedText = encodeURIComponent(reportText);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
});