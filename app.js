const appLoginScreen = document.getElementById('appLoginScreen');
const reportSelectionScreen = document.getElementById('reportSelectionScreen');
const loginScreen = document.getElementById('loginScreen');
const mainContent = document.getElementById('mainContent');
const appLoginForm = document.getElementById('appLoginForm');
const appLoginError = document.getElementById('appLoginError');
const simpleReportBtn = document.getElementById('simpleReportBtn');
const completeReportBtn = document.getElementById('completeReportBtn');
const loginBtn = document.getElementById('loginBtn');
const form = document.getElementById('form');
const reportContainer = document.getElementById('reportContainer');
const shareWhatsAppBtn = document.getElementById('shareWhatsAppBtn');
const filterCampaignsBtn = document.getElementById('filterCampaigns');
const filterAdSetsBtn = document.getElementById('filterAdSets');
const campaignsModal = document.getElementById('campaignsModal');
const adSetsModal = document.getElementById('adSetsModal');
const closeCampaignsModalBtn = document.getElementById('closeCampaignsModal');
const closeAdSetsModalBtn = document.getElementById('closeAdSetsModal');

const backToReportSelectionBtn = document.getElementById('backToReportSelectionBtn');

backToReportSelectionBtn.addEventListener('click', () => {
    showScreen(reportSelectionScreen);
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

// Função para alternar telas
function showScreen(screen) {
    console.log('Alternando para a tela:', screen.id);
    appLoginScreen.style.display = 'none';
    reportSelectionScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    mainContent.style.display = 'none';
    screen.style.display = 'block';
    console.log('Tela atualizada com sucesso:', screen.id);
}

// Função para mostrar/esconder modais e gerenciar estado
function toggleModal(modal, show, isCampaign) {
    if (show && isFilterActivated && ((isCampaign && selectedCampaigns.size === 0) || (!isCampaign && selectedAdSets.size === 0))) {
        return;
    }

    modal.style.display = show ? 'block' : 'none';
    if (show) {
        if (isCampaign) {
            isCampaignFilterActive = true;
            isAdSetFilterActive = false;
            filterAdSetsBtn.disabled = isFilterActivated;
            filterAdSetsBtn.style.cursor = isFilterActivated ? 'not-allowed' : 'pointer';
        } else {
            isAdSetFilterActive = true;
            isCampaignFilterActive = false;
            filterCampaignsBtn.disabled = isFilterActivated;
            filterCampaignsBtn.style.cursor = isFilterActivated ? 'not-allowed' : 'pointer';
        }
    } else {
        if (isCampaign) {
            isCampaignFilterActive = false;
            if (isFilterActivated && selectedCampaigns.size === 0) {
                isFilterActivated = false;
                filterAdSetsBtn.disabled = false;
                filterAdSetsBtn.style.cursor = 'pointer';
            } else {
                filterAdSetsBtn.disabled = isFilterActivated && selectedCampaigns.size > 0;
                filterAdSetsBtn.style.cursor = isFilterActivated && selectedCampaigns.size > 0 ? 'not-allowed' : 'pointer';
            }
            campaignSearchText = '';
            const campaignSearchInput = document.getElementById('campaignSearch');
            if (campaignSearchInput) campaignSearchInput.value = '';
        } else {
            isAdSetFilterActive = false;
            if (isFilterActivated && selectedAdSets.size === 0) {
                isFilterActivated = false;
                filterCampaignsBtn.disabled = false;
                filterCampaignsBtn.style.cursor = 'pointer';
            } else {
                filterCampaignsBtn.disabled = isFilterActivated && selectedAdSets.size > 0;
                filterCampaignsBtn.style.cursor = isFilterActivated && selectedAdSets.size > 0 ? 'not-allowed' : 'pointer';
            }
            adSetSearchText = '';
            const adSetSearchInput = document.getElementById('adSetSearch');
            if (adSetSearchInput) adSetSearchInput.value = '';
        }
    }
    updateFilterButton();
}

// Função para atualizar o botão de ativação/desativação
function updateFilterButton() {
    const campaignsButton = campaignsModal.querySelector('.btn-filter-toggle');
    const adSetsButton = adSetsModal.querySelector('.btn-filter-toggle');

    if (campaignsButton) {
        campaignsButton.textContent = isFilterActivated && selectedCampaigns.size > 0 ? 'Desativar Seleção' : 'Ativar Seleções';
        campaignsButton.disabled = !isFilterActivated && selectedCampaigns.size === 0;
    }
    if (adSetsButton) {
        adSetsButton.textContent = isFilterActivated && selectedAdSets.size > 0 ? 'Desativar Seleção' : 'Ativar Seleções';
        adSetsButton.disabled = !isFilterActivated && selectedAdSets.size === 0;
    }
    filterCampaignsBtn.disabled = isFilterActivated && (selectedAdSets.size > 0 || (selectedCampaigns.size === 0 && !isCampaignFilterActive));
    filterAdSetsBtn.disabled = isFilterActivated && (selectedCampaigns.size > 0 || (selectedAdSets.size === 0 && !isAdSetFilterActive));
    filterCampaignsBtn.style.cursor = filterCampaignsBtn.disabled ? 'not-allowed' : 'pointer';
    filterAdSetsBtn.style.cursor = filterAdSetsBtn.disabled ? 'not-allowed' : 'pointer';
}

// Função para criar e gerenciar opções clicáveis nos modais com valor gasto e pesquisa
function renderOptions(containerId, options, selectedSet, isCampaign) {
    const container = document.getElementById(containerId);
    const searchInput = document.getElementById(isCampaign ? 'campaignSearch' : 'adSetSearch');
    container.innerHTML = options.length === 0 ? '<p>Carregando dados, por favor aguarde...</p>' : '';
    console.log(`Renderizando opções para ${isCampaign ? 'campanhas' : 'conjuntos'} - Total de opções: ${options.length}`);
    if (options.length > 0) {
        function filterOptions(searchText) {
            const filteredOptions = options.filter(option => 
                option.label.toLowerCase().includes(searchText.toLowerCase())
            );
            renderFilteredOptions(filteredOptions, selectedSet, isCampaign);
        }

        function renderFilteredOptions(filteredOptions, set, isCampaignParam) {
            container.innerHTML = '';
            filteredOptions.forEach(option => {
                const div = document.createElement('div');
                div.className = `filter-option ${set.has(option.value) ? 'selected' : ''}`;
                const spend = option.spend !== undefined && option.spend !== null ? parseFloat(option.spend) : 0;
                const spendColor = spend > 0 ? 'green' : 'gray';
                div.innerHTML = `${option.label} <span style="margin-left: 10px; color: ${spendColor};">R$ ${spend.toFixed(2).replace('.', ',')}</span>`;
                div.dataset.value = option.value;
                div.addEventListener('click', () => {
                    const value = option.value;
                    if (set.has(value)) {
                        set.delete(value);
                        div.classList.remove('selected');
                    } else {
                        set.add(value);
                        div.classList.add('selected');
                    }
                    if (set.size === 0 && isFilterActivated) {
                        isFilterActivated = false;
                        if (isCampaignParam) {
                            isCampaignFilterActive = false;
                            filterAdSetsBtn.disabled = false;
                            filterAdSetsBtn.style.cursor = 'pointer';
                        } else {
                            isAdSetFilterActive = false;
                            filterCampaignsBtn.disabled = false;
                            filterCampaignsBtn.style.cursor = 'pointer';
                        }
                    }
                    updateFilterButton();
                });
                container.appendChild(div);
            });

            container.style.maxHeight = '400px';
            container.style.overflowY = 'auto';
            container.style.paddingRight = '10px';
            container.style.marginBottom = '10px';
            container.style.boxSizing = 'border-box';
            container.style.display = 'block';

            const existingButton = container.querySelector('.btn-filter-toggle');
            if (existingButton) existingButton.remove();

            const filterButton = document.createElement('button');
            filterButton.textContent = isFilterActivated && (isCampaignParam ? selectedCampaigns.size > 0 : selectedAdSets.size > 0) ? 'Desativar Seleção' : 'Ativar Seleções';
            filterButton.className = 'btn-filter-toggle';
            filterButton.disabled = (isCampaignParam ? selectedCampaigns.size === 0 : selectedAdSets.size === 0);
            filterButton.addEventListener('click', () => {
                if (isFilterActivated && (isCampaignParam ? selectedCampaigns.size > 0 : selectedAdSets.size > 0)) {
                    isFilterActivated = false;
                    if (isCampaignParam) {
                        selectedCampaigns.clear();
                        isCampaignFilterActive = false;
                    } else {
                        selectedAdSets.clear();
                        isAdSetFilterActive = false;
                    }
                    filterCampaignsBtn.disabled = false;
                    filterAdSetsBtn.disabled = false;
                    filterCampaignsBtn.style.cursor = 'pointer';
                    filterAdSetsBtn.style.cursor = 'pointer';
                } else if (isCampaignParam ? selectedCampaigns.size > 0 : selectedAdSets.size > 0) {
                    isFilterActivated = true;
                    if (isCampaignParam) {
                        isCampaignFilterActive = true;
                        isAdSetFilterActive = false;
                        filterAdSetsBtn.disabled = true;
                        filterAdSetsBtn.style.cursor = 'not-allowed';
                    } else {
                        isAdSetFilterActive = true;
                        isCampaignFilterActive = false;
                        filterCampaignsBtn.disabled = true;
                        filterCampaignsBtn.style.cursor = 'not-allowed';
                    }
                }
                renderFilteredOptions(filteredOptions, set, isCampaignParam);
                updateFilterButton();
            });
            container.appendChild(filterButton);
        }

        const currentSearchText = isCampaign ? campaignSearchText : adSetSearchText;
        if (currentSearchText) {
            filterOptions(currentSearchText);
        } else {
            renderFilteredOptions(options, selectedSet, isCampaign);
        }

        if (searchInput) {
            const newSearchInput = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(newSearchInput, searchInput);
            newSearchInput.addEventListener('input', (e) => {
                const searchText = e.target.value;
                if (isCampaign) {
                    campaignSearchText = searchText;
                } else {
                    adSetSearchText = searchText;
                }
                filterOptions(searchText);
            });
            newSearchInput.value = currentSearchText;
        }
    } else {
        console.warn(`Nenhuma opção disponível para renderizar em ${containerId}`);
        container.innerHTML = '<p>Nenhum dado encontrado para o período selecionado. Tente novamente ou faça login novamente.</p>';
    }
}

// Login do app
appLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('Formulário de login submetido');

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    console.log('Dados do formulário:', { username, password });

    if (username === '' || password === '') {
        console.log('Campos vazios detectados');
        appLoginError.textContent = 'Por favor, preencha todos os campos.';
        appLoginError.style.display = 'block';
        return;
    }

    if (username === '@admin' && password === '134679') {
        console.log('Login bem-sucedido, alternando para reportSelectionScreen');
        appLoginError.style.display = 'none';
        showScreen(reportSelectionScreen);
        usernameInput.value = '';
        passwordInput.value = '';
    } else {
        console.log('Login falhou: usuário ou senha inválidos');
        appLoginError.textContent = 'Usuário ou senha inválidos.';
        appLoginError.style.display = 'block';
        usernameInput.value = '';
        passwordInput.value = '';
    }
});

// Seleção de relatório simplificado
simpleReportBtn.addEventListener('click', () => {
    console.log('Botão Relatório Simplificado clicado - Versão Atualizada (03/03/2025)');
    if (currentAccessToken) {
        console.log('Token de acesso já existe, indo direto para mainContent');
        showScreen(mainContent);
    } else {
        showScreen(loginScreen);
    }
    simpleReportBtn.classList.add('active');
});

completeReportBtn.addEventListener('click', () => {
    console.log('Botão Relatório Completo clicado - Versão Atualizada (03/03/2025)');
    if (!currentAccessToken) {
        console.log('Token de acesso não encontrado. Iniciando login com Facebook...');
        FB.login(function(response) {
            handleCompleteReportLoginResponse(response);
        }, {scope: 'ads_read,ads_management,business_management'});
    } else {
        window.location.href = 'RelatorioCompleto.html';
    }
});

// Login com Facebook e carregamento das contas
loginBtn.addEventListener('click', (event) => {
    event.preventDefault();
    console.log(simpleReportBtn.classList.contains('active') ? 'Botão Login com Facebook clicado (Relatório Simplificado) - Versão Atualizada (03/03/2025)' : 'Botão Login com Facebook clicado (Outro Contexto) - Versão Atualizada (03/03/2025)');

    if (typeof FB === 'undefined') {
        console.error('Facebook SDK não está carregado ou inicializado corretamente.');
        document.getElementById('loginError').textContent = 'Erro: Facebook SDK não está disponível. Verifique sua conexão ou tente novamente.';
        document.getElementById('loginError').style.display = 'block';
        return;
    }

    if (!simpleReportBtn.classList.contains('active')) {
        return;
    }

    if (currentAccessToken) {
        console.log('Usando token existente do localStorage:', currentAccessToken);
        handleSimpleReportLoginResponse({ authResponse: { accessToken: currentAccessToken } });
    } else if (!FB.getAccessToken()) {
        console.log('Inicializando login com Facebook...');
        FB.login(function(response) {
            handleSimpleReportLoginResponse(response);
        }, {scope: 'ads_read,ads_management,business_management'});
    } else {
        console.log('Token de acesso já existe no SDK, prosseguindo...');
        handleSimpleReportLoginResponse({ authResponse: { accessToken: FB.getAccessToken() } });
    }
});

// Função para lidar com a resposta do login do Facebook
function handleSimpleReportLoginResponse(response) {
    if (response.authResponse) {
        console.log('Login com Facebook bem-sucedido (Relatório Simplificado) - Versão Atualizada (03/03/2025)');
        showScreen(mainContent);
        currentAccessToken = response.authResponse.accessToken;
        console.log('Access Token salvo:', currentAccessToken);

        FB.api('/me/adaccounts', { fields: 'id,name', access_token: currentAccessToken }, function(accountResponse) {
            if (accountResponse && !accountResponse.error) {
                console.log('Contas de anúncios carregadas com sucesso');
                const unitSelect = document.getElementById('unitId');
                unitSelect.innerHTML = '<option value="">Escolha a unidade</option>';
                let accounts = accountResponse.data || [];
                accounts.forEach(account => {
                    adAccountsMap[account.id] = account.name;
                });

                FB.api('/me/businesses', { fields: 'id,name', access_token: currentAccessToken }, function(businessResponse) {
                    if (businessResponse && !businessResponse.error) {
                        console.log('Business Managers carregados com sucesso');
                        const businesses = businessResponse.data || [];
                        let businessAccountsPromises = [];

                        businesses.forEach(business => {
                            businessAccountsPromises.push(new Promise((resolve) => {
                                FB.api(
                                    `/${business.id}/owned_ad_accounts`,
                                    { fields: 'id,name', access_token: currentAccessToken },
                                    function(ownedAccountResponse) {
                                        if (ownedAccountResponse && !ownedAccountResponse.error) {
                                            const ownedAccounts = ownedAccountResponse.data || [];
                                            resolve(ownedAccounts);
                                        } else {
                                            console.warn(`Erro ao carregar contas próprias do Business ${business.id}`);
                                            resolve([]);
                                        }
                                    }
                                );
                            }));

                            businessAccountsPromises.push(new Promise((resolve) => {
                                FB.api(
                                    `/${business.id}/client_ad_accounts`,
                                    { fields: 'id,name', access_token: currentAccessToken },
                                    function(clientAccountResponse) {
                                        if (clientAccountResponse && !clientAccountResponse.error) {
                                            const clientAccounts = clientAccountResponse.data || [];
                                            resolve(clientAccounts);
                                        } else {
                                            console.warn(`Erro ao carregar contas compartilhadas do Business ${business.id}`);
                                            resolve([]);
                                        }
                                    }
                                );
                            }));
                        });

                        Promise.all(businessAccountsPromises).then(businessAccountsArrays => {
                            let allBusinessAccounts = [].concat(...businessAccountsArrays);
                            allBusinessAccounts.forEach(account => {
                                if (!adAccountsMap[account.id]) {
                                    adAccountsMap[account.id] = account.name;
                                }
                            });

                            const sortedAccounts = Object.keys(adAccountsMap)
                                .map(accountId => ({
                                    id: accountId,
                                    name: adAccountsMap[accountId]
                                }))
                                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

                            unitSelect.innerHTML = '<option value="">Escolha a unidade</option>';
                            sortedAccounts.forEach(account => {
                                const option = document.createElement('option');
                                option.value = account.id;
                                option.textContent = account.name;
                                unitSelect.appendChild(option);
                            });

                            localStorage.setItem('fbAccessToken', currentAccessToken);
                            localStorage.setItem('adAccountsMap', JSON.stringify(adAccountsMap));
                            console.log('Token e contas salvos no localStorage');
                        });
                    } else {
                        console.error('Erro ao carregar Business Managers:', businessResponse.error);
                        document.getElementById('loginError').textContent = 'Erro ao carregar Business Managers. Tente novamente.';
                        document.getElementById('loginError').style.display = 'block';
                    }
                });
            } else {
                console.error('Erro ao carregar contas de anúncios:', accountResponse.error);
                document.getElementById('loginError').textContent = 'Erro ao carregar contas de anúncios. Tente novamente.';
                document.getElementById('loginError').style.display = 'block';
            }
        });
    } else {
        console.error('Falha no login com Facebook');
        document.getElementById('loginError').textContent = 'Login com Facebook falhou. Tente novamente.';
        document.getElementById('loginError').style.display = 'block';
    }
}

function handleCompleteReportLoginResponse(response) {
    if (response.authResponse) {
        console.log('Login com Facebook bem-sucedido (Relatório Completo) - Versão Atualizada (03/03/2025):', response.authResponse);
        currentAccessToken = response.authResponse.accessToken;
        console.log('Access Token:', currentAccessToken);
        
        localStorage.setItem('fbAccessToken', currentAccessToken);
        
        FB.api('/me/adaccounts', { fields: 'id,name', access_token: currentAccessToken }, function(accountResponse) {
            if (accountResponse && !accountResponse.error) {
                console.log('Resposta da API /me/adaccounts (Relatório Completo) - Versão Atualizada (03/03/2025):', accountResponse);
                let accounts = accountResponse.data || [];
                accounts.forEach(account => {
                    adAccountsMap[account.id] = account.name;
                });

                localStorage.setItem('adAccountsMap', JSON.stringify(adAccountsMap));
                console.log('adAccountsMap salvo no localStorage:', adAccountsMap);

                window.location.href = 'RelatorioCompleto.html';
            } else {
                console.error('Erro ao carregar contas:', accountResponse.error);
                document.getElementById('loginError').textContent = 'Erro ao carregar contas de anúncios: ' + (accountResponse.error.message || 'Erro desconhecido');
                document.getElementById('loginError').style.display = 'block';
            }
        });
    } else {
        console.error('Falha no login com Facebook:', response);
        document.getElementById('loginError').textContent = 'Login cancelado ou falhou. Por favor, tente novamente. Detalhes: ' + (response.error ? response.error.message : 'Erro desconhecido');
        document.getElementById('loginError').style.display = 'block';
    }
}

// Carrega os ad sets e campanhas quando o formulário é preenchido
form.addEventListener('input', async function(e) {
    const unitId = document.getElementById('unitId').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (unitId && startDate && endDate) {
        if (isCampaignFilterActive && campaignSearchText) {
            console.log('Modal de campanhas aberto com filtro ativo, evitando re-renderização.');
            return;
        }

        campaignsMap[unitId] = {};
        adSetsMap[unitId] = {};
        selectedCampaigns.clear();
        selectedAdSets.clear();
        isCampaignFilterActive = false;
        isAdSetFilterActive = false;
        isFilterActivated = false;
        filterCampaignsBtn.disabled = false;
        filterAdSetsBtn.disabled = false;
        filterCampaignsBtn.style.cursor = 'pointer';
        filterAdSetsBtn.style.cursor = 'pointer';
        await Promise.all([
            loadCampaigns(unitId, startDate, endDate),
            loadAdSets(unitId, startDate, endDate)
        ]);
    }
});

// Função para carregar campanhas com paginação
async function loadCampaigns(unitId, startDate, endDate) {
    const startTime = performance.now();
    console.log(`Iniciando carregamento de campanhas para unitId: ${unitId}, período: ${startDate} a ${endDate}`);
    
    campaignsMap[unitId] = {};
    let allCampaigns = [];
    let url = `/${unitId}/campaigns?fields=id,name&access_token=${currentAccessToken}&limit=100`;

    async function fetchCampaigns(fetchUrl) {
        return new Promise((resolve, reject) => {
            FB.api(fetchUrl, function(response) {
                if (response && !response.error) {
                    resolve(response);
                } else {
                    console.error('Erro ao carregar campanhas:', response.error);
                    reject(response.error);
                }
            });
        });
    }

    try {
        while (url) {
            const campaignResponse = await fetchCampaigns(url);
            const campaigns = campaignResponse.data || [];
            allCampaigns = allCampaigns.concat(campaigns);
            url = campaignResponse.paging && campaignResponse.paging.next ? campaignResponse.paging.next : null;
            console.log(`Carregadas ${campaigns.length} campanhas. Total acumulado: ${allCampaigns.length}`);
            if (url) await new Promise(resolve => setTimeout(resolve, 2000)); // Atraso de 2 segundos entre páginas
        }

        if (allCampaigns.length === 0) {
            console.warn(`Nenhuma campanha retornada para unitId: ${unitId}`);
            const campaignsList = document.getElementById('campaignsList');
            if (campaignsList) {
                campaignsList.innerHTML = '<p>Nenhuma campanha encontrada para o período selecionado.</p>';
            }
            return;
        }

        const campaignIds = allCampaigns.map(camp => camp.id);
        const insightPromises = campaignIds.map(campaignId => getCampaignInsights(campaignId, startDate, endDate));
        const insights = await Promise.all(insightPromises);

        campaignIds.forEach((campaignId, index) => {
            const spend = insights[index].spend !== undefined && insights[index].spend !== null ? parseFloat(insights[index].spend) : 0;
            campaignsMap[unitId][campaignId] = {
                name: allCampaigns.find(camp => camp.id === campaignId).name.toLowerCase(),
                insights: { spend: spend }
            };
        });

        if (!isAdSetFilterActive) {
            const campaignOptions = campaignIds.map(id => ({
                value: id,
                label: campaignsMap[unitId][id].name,
                spend: campaignsMap[unitId][id].insights.spend
            }));
            renderOptions('campaignsList', campaignOptions, selectedCampaigns, true);
        }

        const endTime = performance.now();
        console.log(`Carregamento de campanhas concluído em ${(endTime - startTime) / 1000} segundos. Total de campanhas: ${allCampaigns.length}`);
    } catch (error) {
        console.error('Erro ao carregar campanhas com paginação:', error);
        const endTime = performance.now();
        console.log(`Carregamento de campanhas falhou após ${(endTime - startTime) / 1000} segundos`);
        const campaignsList = document.getElementById('campaignsList');
        if (campaignsList) {
            campaignsList.innerHTML = `<p>Erro ao carregar as campanhas: ${error.message || 'Erro desconhecido'}. Tente novamente ou faça login novamente.</p>`;
        }
    }
}

// Função para carregar ad sets com paginação e retry
async function loadAdSets(unitId, startDate, endDate) {
    const startTime = performance.now();
    console.log(`Iniciando carregamento de ad sets para unitId: ${unitId}, período: ${startDate} a ${endDate}`);
    
    adSetsMap[unitId] = {};
    let allAdSets = [];
    let url = `/${unitId}/adsets?fields=id,name&access_token=${currentAccessToken}&limit=100`;

    async function fetchAdSets(fetchUrl, retries = 5, delayMs = 2000) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const adSetResponse = await new Promise((resolve, reject) => {
                    FB.api(fetchUrl, function(response) {
                        if (response && !response.error) {
                            resolve(response);
                        } else {
                            reject(response.error);
                        }
                    });
                });
                return adSetResponse;
            } catch (error) {
                console.warn(`Tentativa ${attempt} falhou para ${fetchUrl}:`, error.message);
                if (attempt === retries) throw error;
                await new Promise(resolve => setTimeout(resolve, delayMs));
                delayMs *= 2; // Backoff exponencial (2s, 4s, 8s, 16s, 32s)
            }
        }
    }

    try {
        while (url) {
            const adSetResponse = await fetchAdSets(url);
            const adSets = adSetResponse.data || [];
            allAdSets = allAdSets.concat(adSets);
            url = adSetResponse.paging && adSetResponse.paging.next ? adSetResponse.paging.next : null;
            console.log(`Carregados ${adSets.length} ad sets. Total acumulado: ${allAdSets.length}`);
            if (url) await new Promise(resolve => setTimeout(resolve, 2000)); // Atraso de 2 segundos entre páginas
        }

        if (allAdSets.length === 0) {
            console.warn(`Nenhum ad set retornado para unitId: ${unitId}`);
            const adSetsList = document.getElementById('adSetsList');
            if (adSetsList) {
                adSetsList.innerHTML = '<p>Nenhum conjunto de anúncios encontrado para o período selecionado.</p>';
            }
            return;
        }

        const adSetIds = allAdSets.map(set => set.id);
        adSetIds.forEach((adSetId, index) => {
            adSetsMap[unitId][adSetId] = {
                name: allAdSets.find(set => set.id === adSetId).name.toLowerCase(),
                insights: { spend: 0, actions: [], reach: 0 }
            };
        });

        if (!isCampaignFilterActive) {
            const adSetOptions = adSetIds.map(id => ({
                value: id,
                label: adSetsMap[unitId][id].name,
                spend: adSetsMap[unitId][id].insights.spend
            }));
            renderOptions('adSetsList', adSetOptions, selectedAdSets, false);
        }

        const endTime = performance.now();
        console.log(`Carregamento de ad sets concluído em ${(endTime - startTime) / 1000} segundos. Total de ad sets: ${allAdSets.length}`);
    } catch (error) {
        console.error('Erro ao carregar ad sets com paginação:', error);
        const endTime = performance.now();
        console.log(`Carregamento de ad sets falhou após ${(endTime - startTime) / 1000} segundos`);
        const adSetsList = document.getElementById('adSetsList');
        if (adSetsList) {
            adSetsList.innerHTML = `<p>Erro ao carregar os conjuntos de anúncios: ${error.message || 'Erro desconhecido'}. Por favor, espere alguns minutos e tente novamente, ou faça login novamente.</p>`;
        }
    }
}

// Funções para obter insights
async function getCampaignInsights(campaignId, startDate, endDate) {
    return new Promise((resolve, reject) => {
        FB.api(
            `/${campaignId}/insights`,
            { fields: ['spend', 'actions', 'reach'], time_range: { since: startDate, until: endDate }, level: 'campaign', access_token: currentAccessToken },
            function(response) {
                if (response && !response.error) {
                    resolve(response.data[0] || {});
                } else {
                    console.error(`Erro ao carregar insights para campanha ${campaignId}:`, response.error);
                    resolve({});
                }
            }
        );
    });
}

async function getAdSetInsights(adSetId, startDate, endDate) {
    return new Promise((resolve, reject) => {
        FB.api(
            `/${adSetId}/insights`,
            { fields: ['spend', 'actions', 'reach'], time_range: { since: startDate, until: endDate }, access_token: currentAccessToken },
            function(response) {
                if (response && !response.error && response.data && response.data.length > 0) {
                    console.log(`Insights para ad set ${adSetId}:`, response.data[0]);
                    resolve(response.data[0]);
                } else {
                    console.warn(`Nenhum insight válido retornado para ad set ${adSetId}:`, response.error || 'Dados ausentes');
                    resolve({ spend: '0', actions: [], reach: '0' });
                }
            }
        );
    });
}

// Configurar eventos para os botões de filtro
filterCampaignsBtn.addEventListener('click', () => {
    if (isFilterActivated && selectedAdSets.size > 0) return;
    isCampaignFilterActive = true;
    toggleModal(campaignsModal, true, true);
});

filterAdSetsBtn.addEventListener('click', () => {
    if (isFilterActivated && selectedCampaigns.size > 0) return;
    isAdSetFilterActive = true;
    toggleModal(adSetsModal, true, false);
});

closeCampaignsModalBtn.addEventListener('click', () => {
    isCampaignFilterActive = false;
    toggleModal(campaignsModal, false, true);
    updateFilterButton();
});

closeAdSetsModalBtn.addEventListener('click', () => {
    isAdSetFilterActive = false;
    toggleModal(adSetsModal, false, false);
    updateFilterButton();
});

// Geração do relatório com soma consolidada dos itens filtrados ativados
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

    if (isFilterActivated) {
        if (selectedCampaigns.size > 0) {
            for (const campaignId of selectedCampaigns) {
                const insights = await getCampaignInsights(campaignId, startDate, endDate);
                if (insights && insights.spend) {
                    totalSpend += parseFloat(insights.spend) || 0;
                }
                if (insights && insights.reach) {
                    totalReach += parseInt(insights.reach) || 0;
                }
                (insights.actions || []).forEach(action => {
                    if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                        totalConversations += parseInt(action.value) || 0;
                    }
                });
            }
        } else if (selectedAdSets.size > 0) {
            for (const adSetId of selectedAdSets) {
                const insights = await getAdSetInsights(adSetId, startDate, endDate);
                if (insights && insights.spend) {
                    console.log(`Spend para ad set ${adSetId}: ${insights.spend}`);
                    totalSpend += parseFloat(insights.spend) || 0;
                    adSetsMap[unitId][adSetId].insights.spend = parseFloat(insights.spend) || 0;
                }
                if (insights && insights.reach) {
                    totalReach += parseInt(insights.reach) || 0;
                    adSetsMap[unitId][adSetId].insights.reach = parseInt(insights.reach) || 0;
                }
                (insights.actions || []).forEach(action => {
                    if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                        totalConversations += parseInt(action.value) || 0;
                        adSetsMap[unitId][adSetId].insights.actions = insights.actions || [];
                    }
                });
            }
            localStorage.setItem(`adSetsMap_${unitId}`, JSON.stringify(adSetsMap[unitId]));
        }
    } else {
        FB.api(
            `/${unitId}/insights`,
            { fields: ['spend', 'actions', 'reach'], time_range: { since: startDate, until: endDate }, level: 'account', access_token: currentAccessToken },
            function(response) {
                if (response && !response.error && response.data.length > 0) {
                    response.data.forEach(data => {
                        if (data.spend) {
                            totalSpend += parseFloat(data.spend) || 0;
                        }
                        if (data.reach) {
                            totalReach += parseInt(data.reach) || 0;
                        }
                        (data.actions || []).forEach(action => {
                            if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                                totalConversations += parseInt(action.value) || 0;
                            }
                        });
                    });
                    const costPerConversation = totalConversations > 0 ? (totalSpend / totalConversations).toFixed(2) : '0';
                    reportContainer.innerHTML = `
                        <p>📊 RELATÓRIO - CA - ${unitName}</p>
                        <p>📅 Período: ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}</p>
                        <p>💰 Investimento Total: R$ ${totalSpend.toFixed(2).replace('.', ',')}</p>
                        <p>💬 Mensagens Iniciadas: ${totalConversations}</p>
                        <p>💵 Custo por Mensagem: R$ ${costPerConversation.replace('.', ',')}</p>
                        <p>📢 Alcance Total: ${totalReach.toLocaleString('pt-BR')} pessoas</p>
                    `;
                    shareWhatsAppBtn.style.display = 'block';
                } else {
                    reportContainer.innerHTML = '<p>Nenhum dado encontrado para os filtros aplicados ou erro na requisição.</p>';
                    if (response.error) console.error('Erro da API:', response.error);
                    shareWhatsAppBtn.style.display = 'none';
                }
            }
        );
        return;
    }

    const costPerConversation = totalConversations > 0 ? (totalSpend / totalConversations).toFixed(2) : '0';
    reportContainer.innerHTML = `
        <p>📊 RELATÓRIO - CA - ${unitName}</p>
        <p>📅 Período: ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}</p>
        <p>💰 Investimento Total: R$ ${totalSpend.toFixed(2).replace('.', ',')}</p>
        <p>💬 Mensagens Iniciadas: ${totalConversations}</p>
        <p>💵 Custo por Mensagem: R$ ${costPerConversation.replace('.', ',')}</p>
        <p>📢 Alcance Total: ${totalReach.toLocaleString('pt-BR')} pessoas</p>
    `;
    shareWhatsAppBtn.style.display = 'block';
});

// Compartilhar no WhatsApp
shareWhatsAppBtn.addEventListener('click', () => {
    const reportText = reportContainer.innerText;
    const encodedText = encodeURIComponent(reportText);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
});

// Função para obter parâmetros da URL
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Verificar autenticação e decidir a tela inicial
const storedToken = localStorage.getItem('fbAccessToken');
const targetScreen = getQueryParam('screen');

if (storedToken && targetScreen === 'reportSelection') {
    console.log('Usuário autenticado e redirecionado para reportSelectionScreen');
    showScreen(reportSelectionScreen);
} else {
    console.log('Mostrando tela de login inicial');
    showScreen(appLoginScreen);
}