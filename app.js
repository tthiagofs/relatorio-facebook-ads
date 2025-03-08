let currentAccessToken = localStorage.getItem('fbAccessToken');
let adAccountsMap = JSON.parse(localStorage.getItem('adAccountsMap')) || {};
let selectedCampaigns = new Set();
let selectedAdSets = new Set();
let campaignsMap = {};
let adSetsMap = {};

window.fbAsyncInit = function() {
    FB.init({
        appId: '618519427538646',
        cookie: true,
        xfbml: true,
        version: 'v20.0'
    });

    // Verifica o status de login ao carregar a página
    checkLoginStatus();
};

function checkLoginStatus() {
    FB.getLoginStatus(function(response) {
        if (response.status === 'connected') {
            currentAccessToken = response.authResponse.accessToken;
            localStorage.setItem('fbAccessToken', currentAccessToken);
            loadAdAccounts();
        } else {
            console.log('Usuário não está logado. Login necessário.');
            // O controle de exibição do botão de login é feito em index.html
        }
    });
}

function loadAdAccounts() {
    FB.api(
        '/me/adaccounts',
        { fields: 'id,name,account_id', access_token: currentAccessToken },
        function(response) {
            if (response && !response.error) {
                adAccountsMap = {};
                const unitSelect = document.getElementById('unitId');
                unitSelect.innerHTML = '<option value="">Selecione uma unidade</option>';
                response.data.forEach(account => {
                    adAccountsMap[account.id] = account.name;
                    const option = document.createElement('option');
                    option.value = account.id;
                    option.textContent = account.name;
                    unitSelect.appendChild(option);
                });
                localStorage.setItem('adAccountsMap', JSON.stringify(adAccountsMap));
            } else {
                console.error('Erro ao carregar contas de anúncios:', response.error);
            }
        }
    );
}

document.getElementById('unitId').addEventListener('change', function() {
    const unitId = this.value;
    if (unitId) {
        campaignsMap[unitId] = {};
        adSetsMap[unitId] = {};
        loadCampaigns(unitId);
    }
});

function loadCampaigns(unitId) {
    FB.api(
        `/${unitId}/campaigns`,
        { fields: 'id,name', access_token: currentAccessToken },
        function(response) {
            if (response && !response.error) {
                const campaignSelect = document.getElementById('campaignFilter');
                campaignSelect.innerHTML = '';
                response.data.forEach(campaign => {
                    campaignsMap[unitId][campaign.id] = { name: campaign.name.toLowerCase() };
                    const option = document.createElement('option');
                    option.value = campaign.id;
                    option.textContent = campaign.name;
                    campaignSelect.appendChild(option);
                });
                loadAdSets(unitId);
            } else {
                console.error('Erro ao carregar campanhas:', response.error);
            }
        }
    );
}

function loadAdSets(unitId) {
    FB.api(
        `/${unitId}/adsets`,
        { fields: 'id,name', limit: 100, access_token: currentAccessToken },
        async function(response) {
            if (response && !response.error) {
                const adSetIds = response.data.map(set => set.id);
                const insights = await Promise.all(adSetIds.map(adSetId => getAdSetInsights(adSetId)));
                adSetIds.forEach((adSetId, index) => {
                    let spend = parseFloat(insights[index].spend) || 0;
                    if (spend > 0) {
                        const adSet = response.data.find(set => set.id === adSetId);
                        adSetsMap[unitId][adSetId] = {
                            name: adSet.name.toLowerCase(),
                            insights: { spend: spend, actions: insights[index].actions || [], reach: insights[index].reach || 0 }
                        };
                    }
                });

                const adSetSelect = document.getElementById('adSetFilter');
                adSetSelect.innerHTML = '';
                Object.keys(adSetsMap[unitId]).forEach(adSetId => {
                    const option = document.createElement('option');
                    option.value = adSetId;
                    option.textContent = adSetsMap[unitId][adSetId].name;
                    adSetSelect.appendChild(option);
                });
            } else {
                console.error('Erro ao carregar conjuntos de anúncios:', response.error);
            }
        }
    );
}

function getAdSetInsights(adSetId) {
    return new Promise(resolve => {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        FB.api(
            `/${adSetId}/insights`,
            { fields: 'spend,actions,reach', time_range: { since: startDate, until: endDate }, access_token: currentAccessToken },
            function(response) {
                if (response && !response.error && response.data.length > 0) {
                    resolve(response.data[0]);
                } else {
                    resolve({ spend: 0, actions: [], reach: 0 });
                }
            }
        );
    });
}

function openFilterModal() {
    document.getElementById('filterModal').style.display = 'block';
}

function closeFilterModal() {
    document.getElementById('filterModal').style.display = 'none';
}

function applyFilters() {
    const campaignFilter = document.getElementById('campaignFilter');
    const adSetFilter = document.getElementById('adSetFilter');
    selectedCampaigns.clear();
    selectedAdSets.clear();

    Array.from(campaignFilter.selectedOptions).forEach(option => {
        selectedCampaigns.add(option.value);
    });

    Array.from(adSetFilter.selectedOptions).forEach(option => {
        selectedAdSets.add(option.value);
    });

    closeFilterModal();
}

document.getElementById('reportForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const unitId = document.getElementById('unitId').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!unitId || !startDate || !endDate) {
        document.getElementById('reportContainer').innerHTML = '<p>Preencha todos os campos obrigatórios (Unidade e Período).</p>';
        return;
    }

    let totalSpend = 0;
    let totalConversations = 0;
    let totalReach = 0;

    if (selectedCampaigns.size > 0) {
        for (const campaignId of selectedCampaigns) {
            const insights = await new Promise(resolve => {
                FB.api(
                    `/${campaignId}/insights`,
                    { fields: 'spend,actions,reach', time_range: { since: startDate, until: endDate }, access_token: currentAccessToken },
                    resolve
                );
            });

            if (insights && !insights.error && insights.data.length > 0) {
                insights.data.forEach(data => {
                    if (data.spend) totalSpend += parseFloat(data.spend) || 0;
                    if (data.reach) totalReach += parseInt(data.reach) || 0;
                    (data.actions || []).forEach(action => {
                        if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                            totalConversations += parseInt(action.value) || 0;
                        }
                    });
                });
            }
        }
    } else if (selectedAdSets.size > 0) {
        for (const adSetId of selectedAdSets) {
            const insights = await getAdSetInsights(adSetId);
            if (insights.spend) totalSpend += parseFloat(insights.spend) || 0;
            if (insights.reach) totalReach += parseInt(insights.reach) || 0;
            (insights.actions || []).forEach(action => {
                if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                    totalConversations += parseInt(action.value) || 0;
                }
            });
        }
    } else {
        const response = await new Promise(resolve => {
            FB.api(
                `/${unitId}/insights`,
                { fields: 'spend,actions,reach', time_range: { since: startDate, until: endDate }, level: 'account', access_token: currentAccessToken },
                resolve
            );
        });

        if (response && !response.error && response.data.length > 0) {
            response.data.forEach(data => {
                if (data.spend) totalSpend += parseFloat(data.spend) || 0;
                if (data.reach) totalReach += parseInt(data.reach) || 0;
                (data.actions || []).forEach(action => {
                    if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                        totalConversations += parseInt(action.value) || 0;
                    }
                });
            });
        } else {
            document.getElementById('reportContainer').innerHTML = '<p>Nenhum dado encontrado para o período selecionado.</p>';
            document.getElementById('shareWhatsAppBtn').style.display = 'none';
            return;
        }
    }

    const costPerConversation = totalConversations > 0 ? (totalSpend / totalConversations).toFixed(2) : '0';

    let reportHTML = `
        <div class="report-header">
            <h2>Relatório Simplificado - ${adAccountsMap[unitId]}</h2>
            <p>📅 Período: ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}</p>
        </div>
        <div class="metrics-grid">
            <div class="metric-card reach">
                <div class="metric-label">Alcance Total</div>
                <div class="metric-value">${totalReach.toLocaleString('pt-BR')} pessoas</div>
            </div>
            <div class="metric-card messages">
                <div class="metric-label">Mensagens Iniciadas</div>
                <div class="metric-value">${totalConversations}</div>
            </div>
            <div class="metric-card cost">
                <div class="metric-label">Custo por Mensagem</div>
                <div class="metric-value">R$ ${costPerConversation.replace('.', ',')}</div>
            </div>
            <div class="metric-card investment">
                <div class="metric-label">Investimento Total</div>
                <div class="metric-value">R$ ${totalSpend.toFixed(2).replace('.', ',')}</div>
            </div>
        </div>
    `;

    document.getElementById('reportContainer').innerHTML = reportHTML;
    document.getElementById('shareWhatsAppBtn').style.display = 'block';
});

function shareOnWhatsApp() {
    const reportContainer = document.getElementById('reportContainer');
    const text = reportContainer.innerText;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
}