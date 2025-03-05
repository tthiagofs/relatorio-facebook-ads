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
const filterCampaignsBtn = document.getElementById('filterCampaigns');
const filterAdSetsBtn = document.getElementById('filterAdSets');
const campaignsModal = document.getElementById('campaignsModal');
const adSetsModal = document.getElementById('adSetsModal');
const closeCampaignsModalBtn = document.getElementById('closeCampaignsModal');
const closeAdSetsModalBtn = document.getElementById('closeAdSetsModal');

// Mapa para armazenar os nomes das contas, IDs dos ad sets e campanhas
const adAccountsMap = {};
const adSetsMap = {}; // Mapa para armazenar IDs, nomes e insights dos ad sets
const campaignsMap = {}; // Mapa para armazenar IDs, nomes e insights das campanhas
let selectedCampaigns = new Set(); // Conjunto para armazenar campanhas selecionadas
let selectedAdSets = new Set(); // Conjunto para armazenar ad sets selecionados
let isCampaignFilterActive = false;
let isAdSetFilterActive = false;
let isFilterActivated = false; // Novo estado para indicar se os filtros estão ativados

// Função para alternar telas
function showScreen(screen) {
    appLoginScreen.style.display = 'none';
    reportSelectionScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    mainContent.style.display = 'none';
    screen.style.display = 'block';
}

// Função para mostrar/esconder modais e gerenciar estado
function toggleModal(modal, show, isCampaign) {
    // Permite abrir o modal para desativar, mesmo com filtros ativados, se houver seleções ativas
    if (show && isFilterActivated && ((isCampaign && selectedCampaigns.size === 0) || (!isCampaign && selectedAdSets.size === 0))) {
        return; // Impede abrir o modal se os filtros já estiverem ativados sem seleções
    }

    modal.style.display = show ? 'block' : 'none';
    if (show) {
        if (isCampaign) {
            isCampaignFilterActive = true;
            isAdSetFilterActive = false;
            filterAdSetsBtn.disabled = isFilterActivated; // Desativa o botão de conjuntos se filtros ativados
            filterAdSetsBtn.style.cursor = isFilterActivated ? 'not-allowed' : 'pointer';
        } else {
            isAdSetFilterActive = true;
            isCampaignFilterActive = false;
            filterCampaignsBtn.disabled = isFilterActivated; // Desativa o botão de campanhas se filtros ativados
            filterCampaignsBtn.style.cursor = isFilterActivated ? 'not-allowed' : 'pointer';
        }
    } else {
        if (isCampaign) {
            isCampaignFilterActive = false;
            // Verifica se os filtros devem ser desativados ao fechar o modal sem seleções
            if (isFilterActivated && selectedCampaigns.size === 0) {
                isFilterActivated = false;
                filterAdSetsBtn.disabled = false;
                filterAdSetsBtn.style.cursor = 'pointer';
            } else {
                filterAdSetsBtn.disabled = isFilterActivated && selectedCampaigns.size > 0; // Mantém desativado se filtros ativos com seleções
                filterAdSetsBtn.style.cursor = isFilterActivated && selectedCampaigns.size > 0 ? 'not-allowed' : 'pointer';
            }
        } else {
            isAdSetFilterActive = false;
            // Verifica se os filtros devem ser desativados ao fechar o modal sem seleções
            if (isFilterActivated && selectedAdSets.size === 0) {
                isFilterActivated = false;
                filterCampaignsBtn.disabled = false;
                filterCampaignsBtn.style.cursor = 'pointer';
            } else {
                filterCampaignsBtn.disabled = isFilterActivated && selectedAdSets.size > 0; // Mantém desativado se filtros ativos com seleções
                filterCampaignsBtn.style.cursor = isFilterActivated && selectedAdSets.size > 0 ? 'not-allowed' : 'pointer';
            }
        }
    }
    updateFilterButton(); // Atualiza o estado do botão de ativação/desativação
}

// Função para atualizar o botão de ativação/desativação
function updateFilterButton() {
    const campaignsButton = campaignsModal.querySelector('.btn-filter-toggle');
    const adSetsButton = adSetsModal.querySelector('.btn-filter-toggle');

    if (campaignsButton) {
        campaignsButton.textContent = isFilterActivated && selectedCampaigns.size > 0 ? 'Desativar Seleção' : 'Ativar Seleções';
        campaignsButton.disabled = !isFilterActivated && selectedCampaigns.size === 0; // Desativa se não houver seleções antes de ativar
    }
    if (adSetsButton) {
        adSetsButton.textContent = isFilterActivated && selectedAdSets.size > 0 ? 'Desativar Seleção' : 'Ativar Seleções';
        adSetsButton.disabled = !isFilterActivated && selectedAdSets.size === 0; // Desativa se não houver seleções antes de ativar
    }
    // Atualiza o estado dos botões de filtro com base nos filtros ativados
    filterCampaignsBtn.disabled = isFilterActivated && (selectedAdSets.size > 0 || (selectedCampaigns.size === 0 && !isCampaignFilterActive));
    filterAdSetsBtn.disabled = isFilterActivated && (selectedCampaigns.size > 0 || (selectedAdSets.size === 0 && !isAdSetFilterActive));
    filterCampaignsBtn.style.cursor = filterCampaignsBtn.disabled ? 'not-allowed' : 'pointer';
    filterAdSetsBtn.style.cursor = filterAdSetsBtn.disabled ? 'not-allowed' : 'pointer';
}

// Função para criar e gerenciar opções clicáveis nos modals com valor gasto e pesquisa
function renderOptions(containerId, options, selectedSet, isCampaign) {
    const container = document.getElementById(containerId);
    const searchInput = document.getElementById(isCampaign ? 'campaignSearch' : 'adSetSearch');
    container.innerHTML = options.length === 0 ? '<p>Carregando dados, por favor aguarde...</p>' : ''; // Feedback visual melhorado
    console.log(`Renderizando opções para ${isCampaign ? 'campanhas' : 'conjuntos'} - Total de opções: ${options.length}`); // Log para depuração
    if (options.length > 0) {
        // Função para filtrar opções com base no texto de pesquisa
        function filterOptions(searchText) {
            const filteredOptions = options.filter(option => 
                option.label.toLowerCase().includes(searchText.toLowerCase())
            );
            renderFilteredOptions(filteredOptions, selectedSet, isCampaign);
        }

        // Função para renderizar as opções filtradas
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
                    // Atualiza o estado do filtro se não houver mais seleções
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
                    updateFilterButton(); // Atualiza o botão de ativação/desativação após cada clique
                });
                container.appendChild(div);
            });

            // Adiciona botão de "Ativar Seleções/Desativar Seleção" ao final do modal
            const existingButton = container.querySelector('.btn-filter-toggle');
            if (existingButton) existingButton.remove(); // Remove o botão antigo para evitar duplicação

            const filterButton = document.createElement('button');
            filterButton.textContent = isFilterActivated && (isCampaignParam ? selectedCampaigns.size > 0 : selectedAdSets.size > 0) ? 'Desativar Seleção' : 'Ativar Seleções';
            filterButton.className = 'btn-filter-toggle';
            filterButton.disabled = (isCampaignParam ? selectedCampaigns.size === 0 : selectedAdSets.size === 0); // Desativa se não houver seleções
            filterButton.addEventListener('click', () => {
                if (isFilterActivated && (isCampaignParam ? selectedCampaigns.size > 0 : selectedAdSets.size > 0)) {
                    // Desativa os filtros
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
                    // Ativa os filtros apenas se houver seleções
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
                renderFilteredOptions(filteredOptions, set, isCampaignParam); // Re-renderiza para atualizar o botão
                updateFilterButton(); // Garante que o estado do botão seja atualizado
            });
            container.appendChild(filterButton);
        }

        // Renderiza todas as opções inicialmente
        renderFilteredOptions(options, selectedSet, isCampaign);

        // Adiciona evento de pesquisa
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                filterOptions(e.target.value);
            });
        }
    } else {
        console.warn(`Nenhuma opção disponível para renderizar em ${containerId}`); // Log para depuração
        container.innerHTML = '<p>Nenhum dado encontrado para o período selecionado.</p>';
    }
}

// Login do app
appLoginForm.addEventListener('submit', (e) => {
    console.log('Formulário de login submetido'); // Log para depuração
    e.preventDefault(); // Impede o comportamento padrão do formulário
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    console.log('Dados do formulário:', { username, password }); // Log para depuração

    if (username === '@admin' && password === '134679') {
        console.log('Login bem-sucedido, alternando para reportSelectionScreen'); // Log para depuração
        showScreen(reportSelectionScreen);
    } else {
        console.log('Login falhou: usuário ou senha inválidos'); // Log para depuração
        appLoginError.textContent = 'Usuário ou senha inválidos.';
        appLoginError.style.display = 'block';
    }
});

// Seleção de relatório simplificado
simpleReportBtn.addEventListener('click', () => {
    console.log('Botão Relatório Simplificado clicado - Versão Atualizada (03/03/2025)');
    showScreen(loginScreen);
    simpleReportBtn.classList.add('active'); // Marca o botão como ativo para identificar o contexto
});

// Login com Facebook e carregamento das contas
loginBtn.addEventListener('click', (event) => {
    event.preventDefault(); // Impede qualquer comportamento padrão do botão
    console.log(simpleReportBtn.classList.contains('active') ? 'Botão Login com Facebook clicado (Relatório Simplificado) - Versão Atualizada (03/03/2025)' : 'Botão Login com Facebook clicado (Outro Contexto) - Versão Atualizada (03/03/2025)'); // Log para confirmar evento

    if (typeof FB === 'undefined') {
        console.error('Facebook SDK não está carregado ou inicializado corretamente.');
        document.getElementById('loginError').textContent = 'Erro: Facebook SDK não está disponível. Verifique sua conexão ou tente novamente.';
        document.getElementById('loginError').style.display = 'block';
        return;
    }

    if (!simpleReportBtn.classList.contains('active')) {
        return; // Impede a execução se não for o contexto do Relatório Simplificado
    }

    // Adiciona permissões extras, incluindo business_management
    FB.login(function(response) {
        if (response.authResponse) {
            console.log('Login com Facebook bem-sucedido (Relatório Simplificado) - Versão Atualizada (03/03/2025):', response.authResponse);
            showScreen(mainContent);

            // Obtém o token de acesso para verificar permissões
            const accessToken = response.authResponse.accessToken;
            console.log('Access Token:', accessToken);

            // Verifica o status da conta específica CA - Oral Centter Jaíba (ID: 9586847491331372)
            FB.api('/9586847491331372', { fields: 'id,name,account_status', access_token: accessToken }, function(statusResponse) {
                if (statusResponse && !statusResponse.error) {
                    console.log('Status da conta CA - Oral Centter Jaíba (ID: 9586847491331372):', statusResponse);
                    if (statusResponse.account_status !== 1) {
                        console.warn('A conta CA - Oral Centter Jaíba (ID: 9586847491331372) não está ativa. Status:', statusResponse.account_status);
                        document.getElementById('loginError').textContent = 'A conta CA - Oral Centter Jaíba (ID: 9586847491331372) não está ativa. Verifique o status no Business Manager.';
                        document.getElementById('loginError').style.display = 'block';
                    }
                } else {
                    console.error('Erro ao verificar o status da conta CA - Oral Centter Jaíba (ID: 9586847491331372):', statusResponse.error);
                    document.getElementById('loginError').textContent = 'Erro ao verificar o status da conta CA - Oral Centter Jaíba: ' + (statusResponse.error.message || 'Erro desconhecido') + '. Verifique se a conta existe e se você tem permissões.';
                    document.getElementById('loginError').style.display = 'block';
                }
            });

            // Lista as contas diretamente com /me/adaccounts
            FB.api('/me/adaccounts', { fields: 'id,name', access_token: accessToken }, function(accountResponse) {
                if (accountResponse && !accountResponse.error) {
                    console.log('Resposta da API /me/adaccounts (Relatório Simplificado) - Versão Atualizada (03/03/2025):', accountResponse);
                    const unitSelect = document.getElementById('unitId');
                    unitSelect.innerHTML = '<option value="">Escolha a unidade</option>';
                    let accounts = accountResponse.data || [];
                    accounts.forEach(account => {
                        adAccountsMap[account.id] = account.name;
                        if (account.id === '1187332129240271') {
                            console.log('Conta 1187332129240271 - CA 01 - Oral Centter Sete Lagoas encontrada:', account);
                        }
                        if (account.id === '9586847491331372') {
                            console.log('Conta 9586847491331372 - CA - Oral Centter Jaíba encontrada:', account);
                        }
                    });

                    // Lista os Business Managers associados ao usuário
                    FB.api('/me/businesses', { fields: 'id,name', access_token: accessToken }, function(businessResponse) {
                        if (businessResponse && !businessResponse.error) {
                            console.log('Resposta da API /me/businesses (Relatório Simplificado) - Versão Atualizada (03/03/2025):', businessResponse);
                            const businesses = businessResponse.data || [];
                            let businessAccountsPromises = [];

                            businesses.forEach(business => {
                                // Lista contas pertencentes ao Business Manager (owned_ad_accounts)
                                businessAccountsPromises.push(new Promise((resolve) => {
                                    FB.api(
                                        `/${business.id}/owned_ad_accounts`,
                                        { fields: 'id,name', access_token: accessToken },
                                        function(ownedAccountResponse) {
                                            if (ownedAccountResponse && !ownedAccountResponse.error) {
                                                console.log(`Contas próprias do Business Manager ${business.id} (${business.name}):`, ownedAccountResponse);
                                                const ownedAccounts = ownedAccountResponse.data || [];
                                                resolve(ownedAccounts);
                                            } else {
                                                console.error(`Erro ao carregar contas próprias do Business Manager ${business.id}:`, ownedAccountResponse.error);
                                                resolve([]);
                                            }
                                        }
                                    );
                                }));

                                // Lista contas compartilhadas com o Business Manager (client_ad_accounts)
                                businessAccountsPromises.push(new Promise((resolve) => {
                                    FB.api(
                                        `/${business.id}/client_ad_accounts`,
                                        { fields: 'id,name', access_token: accessToken },
                                        function(clientAccountResponse) {
                                            if (clientAccountResponse && !clientAccountResponse.error) {
                                                console.log(`Contas compartilhadas com o Business Manager ${business.id} (${business.name}):`, clientAccountResponse);
                                                const clientAccounts = clientAccountResponse.data || [];
                                                resolve(clientAccounts);
                                            } else {
                                                console.error(`Erro ao carregar contas compartilhadas do Business Manager ${business.id}:`, clientAccountResponse.error);
                                                resolve([]);
                                            }
                                        }
                                    );
                                }));
                            });

                            // Aguarda todas as chamadas para Business Managers
                            Promise.all(businessAccountsPromises).then(businessAccountsArrays => {
                                let allBusinessAccounts = [].concat(...businessAccountsArrays);
                                allBusinessAccounts.forEach(account => {
                                    if (!adAccountsMap[account.id]) { // Evita duplicatas
                                        adAccountsMap[account.id] = account.name;
                                        if (account.id === '1187332129240271') {
                                            console.log('Conta 1187332129240271 - CA 01 - Oral Centter Sete Lagoas encontrada (via Business Manager):', account);
                                        }
                                        if (account.id === '9586847491331372') {
                                            console.log('Conta 9586847491331372 - CA - Oral Centter Jaíba encontrada (via Business Manager):', account);
                                        }
                                    }
                                });

                                // Organiza as contas em ordem alfabética
                                const sortedAccounts = Object.keys(adAccountsMap)
                                    .map(accountId => ({
                                        id: accountId,
                                        name: adAccountsMap[accountId]
                                    }))
                                    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

                                // Preenche o dropdown com as contas ordenadas
                                unitSelect.innerHTML = '<option value="">Escolha a unidade</option>';
                                sortedAccounts.forEach(account => {
                                    const option = document.createElement('option');
                                    option.value = account.id;
                                    option.textContent = account.name;
                                    unitSelect.appendChild(option);
                                });

                                // Verifica se as contas específicas foram encontradas após todas as chamadas
                                const seteLagoasFound = Object.keys(adAccountsMap).includes('1187332129240271');
                                const jaibaFound = Object.keys(adAccountsMap).includes('9586847491331372');

                                if (!seteLagoasFound) {
                                    console.warn('Conta 1187332129240271 - CA 01 - Oral Centter Sete Lagoas NÃO encontrada após todas as chamadas da API.');
                                } else {
                                    console.log('Conta 1187332129240271 - CA 01 - Oral Centter Sete Lagoas confirmada no adAccountsMap.');
                                }

                                if (!jaibaFound) {
                                    console.warn('Conta 9586847491331372 - CA - Oral Centter Jaíba NÃO encontrada após todas as chamadas da API.');
                                } else {
                                    console.log('Conta 9586847491331372 - CA - Oral Centter Jaíba confirmada no adAccountsMap.');
                                }

                                // Exibe mensagem de erro apenas se uma das contas não foi encontrada
                                if (!seteLagoasFound || !jaibaFound) {
                                    document.getElementById('loginError').textContent = 'Uma ou mais contas esperadas (Sete Lagoas ou Jaíba) não foram encontradas. Verifique suas permissões ou o status das contas.';
                                    document.getElementById('loginError').style.display = 'block';
                                } else {
                                    // Se ambas as contas foram encontradas, limpa qualquer mensagem de erro
                                    document.getElementById('loginError').textContent = '';
                                    document.getElementById('loginError').style.display = 'none';
                                }
                            });
                        } else {
                            console.error('Erro ao carregar Business Managers:', businessResponse.error);
                            document.getElementById('loginError').textContent = 'Erro ao carregar Business Managers: ' + (businessResponse.error.message || 'Erro desconhecido');
                            document.getElementById('loginError').style.display = 'block';
                        }
                    });
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
    }, {scope: 'ads_read,ads_management,business_management'}); // Adiciona business_management
});

// Carrega os ad sets e campanhas quando o formulário é preenchido
form.addEventListener('input', async function(e) {
    const unitId = document.getElementById('unitId').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (unitId && startDate && endDate) {
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

// Função para carregar campanhas
async function loadCampaigns(unitId, startDate, endDate) {
    const startTime = performance.now(); // Medir tempo de carregamento
    console.log(`Iniciando carregamento de campanhas para unitId: ${unitId}, período: ${startDate} a ${endDate}`); // Log para depuração
    FB.api(
        `/${unitId}/campaigns`,
        { fields: 'id,name' },
        async function(campaignResponse) {
            if (campaignResponse && !campaignResponse.error) {
                console.log(`Resposta da API para campanhas:`, campaignResponse); // Log para depuração
                campaignsMap[unitId] = {};
                const campaignIds = campaignResponse.data.map(camp => camp.id);
                const insightPromises = campaignIds.map(campaignId => getCampaignInsights(campaignId, startDate, endDate));

                const insights = await Promise.all(insightPromises);
                campaignIds.forEach((campaignId, index) => {
                    const spend = insights[index].spend !== undefined && insights[index].spend !== null ? parseFloat(insights[index].spend) : 0;
                    campaignsMap[unitId][campaignId] = {
                        name: campaignResponse.data.find(camp => camp.id === campaignId).name.toLowerCase(),
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
                console.log(`Carregamento de campanhas concluído em ${(endTime - startTime) / 1000} segundos`); // Log do tempo de carregamento
            } else {
                console.error('Erro ao carregar campanhas:', campaignResponse.error);
            }
        }
    );
}

// Função para carregar ad sets, usando getAdSetInsights para garantir consistência
async function loadAdSets(unitId, startDate, endDate) {
    const startTime = performance.now(); // Medir tempo de carregamento
    console.log(`Iniciando carregamento de ad sets para unitId: ${unitId}, período: ${startDate} a ${endDate}`); // Log para depuração
    FB.api(
        `/${unitId}/adsets`,
        { fields: 'id,name', limit: 50 }, // Adiciona limite inicial para evitar sobrecarga
        async function(adSetResponse) {
            if (adSetResponse && !adSetResponse.error) {
                console.log(`Resposta da API para ad sets:`, adSetResponse); // Log para depuração
                adSetsMap[unitId] = {};
                const adSetIds = adSetResponse.data.map(set => set.id);

                // Paraleliza as chamadas para getAdSetInsights
                const insightPromises = adSetIds.map(adSetId => getAdSetInsights(adSetId, startDate, endDate));
                const insights = await Promise.all(insightPromises);

                adSetIds.forEach((adSetId, index) => {
                    let spend = 0;
                    if (insights[index].spend !== undefined && insights[index].spend !== null) {
                        spend = parseFloat(insights[index].spend) || 0;
                        if (isNaN(spend)) {
                            console.warn(`Valor inválido de spend para ad set ${adSetId}: ${insights[index].spend}`);
                            spend = 0;
                        }
                    }
                    console.log(`Spend para ad set ${adSetId}: ${spend}`); // Log para depuração
                    // Só adiciona ad sets com spend > 0
                    if (spend > 0) {
                        const adSet = adSetResponse.data.find(set => set.id === adSetId);
                        adSetsMap[unitId][adSetId] = {
                            name: adSet.name.toLowerCase(),
                            insights: { spend: spend, actions: insights[index].actions || [], reach: insights[index].reach || 0 }
                        };
                    }
                });

                console.log(`adSetsMap[${unitId}] após carregamento:`, adSetsMap[unitId]); // Log para depuração

                if (!isCampaignFilterActive) {
                    const adSetOptions = Object.keys(adSetsMap[unitId])
                        .filter(id => adSetsMap[unitId][id].insights.spend > 0)
                        .map(id => ({
                            value: id,
                            label: adSetsMap[unitId][id].name,
                            spend: adSetsMap[unitId][id].insights.spend // Usa o spend correto da API
                        }));
                    renderOptions('adSetsList', adSetOptions, selectedAdSets, false);
                }

                const endTime = performance.now();
                console.log(`Carregamento de ad sets concluído em ${(endTime - startTime) / 1000} segundos`); // Log do tempo de carregamento
            } else {
                console.error('Erro ao carregar ad sets:', adSetResponse.error);
                const endTime = performance.now();
                console.log(`Carregamento de ad sets falhou após ${(endTime - startTime) / 1000} segundos`); // Log do tempo de falha
            }
        }
    );
}

// Função para atualizar as opções de ad sets (não usada aqui, mas mantida para compatibilidade)
function updateAdSets(selectedCampaigns) {
    const unitId = document.getElementById('unitId').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (unitId && startDate && endDate && !isAdSetFilterActive) {
        let validAdSetIds = Object.keys(adSetsMap[unitId] || {});
        validAdSetIds = validAdSetIds.filter(id => {
            const adSetData = adSetsMap[unitId][id];
            return adSetData && adSetData.insights.spend > 0; // Filtra apenas ad sets com gastos
        });

        const adSetOptions = validAdSetIds.map(id => ({
            value: id,
            label: adSetsMap[unitId][id].name,
            spend: adSetsMap[unitId][id].insights.spend // Usa o spend correto da API
        }));
        renderOptions('adSetsList', adSetOptions, selectedAdSets, false);
    }
}

// Funções para obter insights
async function getCampaignInsights(campaignId, startDate, endDate) {
    return new Promise((resolve, reject) => {
        FB.api(
            `/${campaignId}/insights`,
            { fields: ['spend', 'actions', 'reach'], time_range: { since: startDate, until: endDate }, level: 'campaign' },
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
            { fields: ['spend', 'actions', 'reach'], time_range: { since: startDate, until: endDate } },
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

// Configurar eventos para os botões de filtro com exclusão mútua simples
filterCampaignsBtn.addEventListener('click', () => {
    if (isFilterActivated && selectedAdSets.size > 0) return; // Impede abrir se há seleções ativas de ad sets
    isCampaignFilterActive = true;
    toggleModal(campaignsModal, true, true);
});

filterAdSetsBtn.addEventListener('click', () => {
    if (isFilterActivated && selectedCampaigns.size > 0) return; // Impede abrir se há seleções ativas de campanhas
    isAdSetFilterActive = true;
    toggleModal(adSetsModal, true, false);
});

closeCampaignsModalBtn.addEventListener('click', () => {
    isCampaignFilterActive = false;
    toggleModal(campaignsModal, false, true);
    updateFilterButton(); // Atualiza o estado do botão de ativação/desativação
});

closeAdSetsModalBtn.addEventListener('click', () => {
    isAdSetFilterActive = false;
    toggleModal(adSetsModal, false, false);
    updateFilterButton(); // Atualiza o estado do botão de ativação/desativação
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
                    // Log para depuração do valor de spend
                    console.log(`Spend para ad set ${adSetId}: ${insights.spend}`);
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
        }
    } else {
        FB.api(
            `/${unitId}/insights`,
            { fields: ['spend', 'actions', 'reach'], time_range: { since: startDate, until: endDate }, level: 'account' },
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

// Mostrar tela inicial
showScreen(appLoginScreen);