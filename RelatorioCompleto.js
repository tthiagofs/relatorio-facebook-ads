const mainContent = document.getElementById('mainContent');
const form = document.getElementById('form');
const reportContainer = document.getElementById('reportContainer');
const exportPdfBtn = document.getElementById('exportPdfBtn');
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

// Mapa para armazenar os nomes das contas, IDs dos ad sets e campanhas
const adAccountsMap = JSON.parse(localStorage.getItem('adAccountsMap')) || {};
const adSetsMap = {};
const campaignsMap = {};
let selectedCampaigns = new Set();
let selectedAdSets = new Set();
let isCampaignFilterActive = false;
let isAdSetFilterActive = false;
let isFilterActivated = false;
let campaignSearchText = '';
let adSetSearchText = '';
let currentAccessToken = localStorage.getItem('fbAccessToken') || null;
let comparisonData = null;

const backToReportSelectionBtn = document.getElementById('backToReportSelectionBtn');

backToReportSelectionBtn.addEventListener('click', () => {
    window.location.href = 'index.html?screen=reportSelection';
});

// Função para obter insights de um anúncio
async function getAdInsights(adId, startDate, endDate) {
    return new Promise((resolve) => {
        FB.api(
            `/${adId}/insights`,
            { fields: ['spend', 'actions'], time_range: { since: startDate, until: endDate }, access_token: currentAccessToken },
            function(response) {
                if (response && !response.error && response.data && response.data.length > 0) {
                    console.log(`Insights para anúncio ${adId}:`, response.data[0]);
                    resolve(response.data[0]);
                } else {
                    console.warn(`Nenhum insight válido para anúncio ${adId}:`, response.error || 'Dados ausentes');
                    resolve({ spend: '0', actions: [] });
                }
            }
        );
    });
}

// Função para carregar anúncios e seus insights
async function loadAds(unitId, startDate, endDate, filteredCampaigns = null, filteredAdSets = null) {
    const startTime = performance.now();
    console.log(`Iniciando carregamento de anúncios para unitId: ${unitId}, período: ${startDate} a ${endDate}`);
    
    let adsMap = {};
    let apiEndpoint = filteredAdSets && filteredAdSets.size > 0 
        ? null
        : filteredCampaigns && filteredCampaigns.size > 0 
        ? `/${unitId}/ads` 
        : `/${unitId}/ads`;

    if (filteredAdSets && filteredAdSets.size > 0) {
        const adPromises = Array.from(filteredAdSets).map(adSetId => 
            new Promise((resolve) => {
                FB.api(
                    `/${adSetId}/ads`,
                    { fields: 'id,creative', access_token: currentAccessToken },
                    async function(adResponse) {
                        if (adResponse && !adResponse.error) {
                            const adIds = adResponse.data.map(ad => ad.id);
                            const insightPromises = adIds.map(adId => getAdInsights(adId, startDate, endDate));
                            const creativePromises = adResponse.data.map(ad => getCreativeData(ad.creative.id));
                            const [insights, creatives] = await Promise.all([
                                Promise.all(insightPromises),
                                Promise.all(creativePromises)
                            ]);
                            adIds.forEach((adId, index) => {
                                adsMap[adId] = {
                                    insights: insights[index],
                                    creative: creatives[index]
                                };
                            });
                            resolve();
                        } else {
                            console.error(`Erro ao carregar anúncios do ad set ${adSetId}:`, adResponse.error);
                            resolve();
                        }
                    }
                );
            })
        );
        await Promise.all(adPromises);
    } else {
        let nextPage = `${apiEndpoint}?fields=id,creative&limit=100&access_token=${currentAccessToken}`;
        while (nextPage) {
            const adResponse = await new Promise(resolve => {
                FB.api(nextPage, resolve);
            });

            if (adResponse && !adResponse.error) {
                console.log(`Resposta da API para anúncios:`, adResponse);
                const adIds = adResponse.data.map(ad => ad.id);
                const insightPromises = adIds.map(adId => getAdInsights(adId, startDate, endDate));
                const creativePromises = adResponse.data.map(ad => getCreativeData(ad.creative.id));
                const [insights, creatives] = await Promise.all([
                    Promise.all(insightPromises),
                    Promise.all(creativePromises)
                ]);

                adIds.forEach((adId, index) => {
                    adsMap[adId] = {
                        insights: insights[index],
                        creative: creatives[index]
                    };
                });
                nextPage = adResponse.paging && adResponse.paging.next ? adResponse.paging.next : null;
                if (nextPage) await new Promise(resolve => setTimeout(resolve, 2000)); // Atraso de 2 segundos
            } else {
                console.error('Erro ao carregar anúncios:', adResponse.error);
                nextPage = null;
            }
        }
    }

    const endTime = performance.now();
    console.log(`Carregamento de anúncios concluído em ${(endTime - startTime) / 1000} segundos`);
    return adsMap;
}

// Função para obter dados do criativo (imagens ou thumbnails de vídeos)
async function getCreativeData(creativeId) {
    return new Promise((resolve) => {
        FB.api(
            `/${creativeId}`,
            { fields: 'object_story_spec,thumbnail_url,effective_object_story_id,image_hash', access_token: currentAccessToken },
            async function(response) {
                if (response && !response.error) {
                    console.log('Resposta da API para criativo:', response);
                    let imageUrl = 'https://dummyimage.com/600x600/ccc/fff';

                    if (response.image_hash) {
                        const imageResponse = await new Promise((imageResolve) => {
                            FB.api(
                                `/adimages`,
                                { hashes: [response.image_hash], fields: 'url', access_token: currentAccessToken },
                                function(imageResponse) {
                                    imageResolve(imageResponse);
                                }
                            );
                        });
                        if (imageResponse && !imageResponse.error && imageResponse.data && imageResponse.data.length > 0) {
                            imageUrl = imageResponse.data[0].url;
                            console.log('Imagem de alta resolução via image_hash:', imageUrl);
                        } else {
                            console.warn('Falha ao buscar imagem via image_hash:', imageResponse ? imageResponse.error : 'Nenhum dado retornado');
                        }
                    }
                    if (imageUrl.includes('dummyimage') && response.object_story_spec) {
                        const { photo_data, video_data, link_data } = response.object_story_spec;
                        if (photo_data && photo_data.images && photo_data.images.length > 0) {
                            const largestImage = photo_data.images.reduce((prev, current) => 
                                (prev.width > current.width) ? prev : current, photo_data.images[0]);
                            imageUrl = largestImage.original_url || largestImage.url || photo_data.url;
                            console.log('Imagem selecionada (photo_data):', imageUrl);
                        } else if (video_data && video_data.picture) {
                            imageUrl = video_data.picture;
                            console.log('Thumbnail do vídeo selecionada:', imageUrl);
                        } else if (link_data && link_data.picture) {
                            imageUrl = link_data.picture;
                            console.log('Imagem de link selecionada:', imageUrl);
                        }
                    }
                    if (imageUrl.includes('dummyimage') && response.effective_object_story_id) {
                        try {
                            const storyResponse = await new Promise((storyResolve) => {
                                FB.api(
                                    `/${response.effective_object_story_id}`,
                                    { fields: 'full_picture', access_token: currentAccessToken },
                                    function(storyResponse) {
                                        storyResolve(storyResponse);
                                    }
                                );
                            });
                            if (storyResponse && !storyResponse.error && storyResponse.full_picture) {
                                imageUrl = storyResponse.full_picture;
                                console.log('Imagem da postagem original (alta resolução):', imageUrl);
                            } else {
                                console.warn('Nenhum full_picture encontrado para effective_object_story_id:', response.effective_object_story_id, storyResponse.error || 'Nenhum erro, mas sem full_picture');
                            }
                        } catch (error) {
                            console.error('Erro ao buscar full_picture via effective_object_story_id:', error);
                        }
                    }
                    if (imageUrl.includes('dummyimage') && response.thumbnail_url) {
                        imageUrl = response.thumbnail_url;
                        console.warn('Usando thumbnail como último recurso:', imageUrl);
                    }

                    resolve({ imageUrl: imageUrl });
                } else {
                    console.error(`Erro ao carregar criativo ${creativeId}:`, response.error);
                    resolve({ imageUrl: 'https://dummyimage.com/600x600/ccc/fff' });
                }
            }
        );
    });
}

// Função para converter imagem para base64
async function fetchImageAsBase64(url) {
    try {
        const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
        if (!response.ok) throw new Error('Erro ao carregar imagem');
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Falha ao converter imagem'));
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Erro ao carregar imagem:', error);
        return null;
    }
}

// Verificar se o token de acesso está disponível
if (!currentAccessToken) {
    console.log('Token de acesso não encontrado. Redirecionando para a página de login.');
    alert('Você precisa fazer login com o Facebook primeiro. Redirecionando para a página inicial.');
    setTimeout(() => {
        window.location.replace('index.html');
    }, 100);
    throw new Error('Token de acesso não encontrado. Redirecionamento iniciado.');
}

// Preencher o dropdown de unidades com os dados do localStorage
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

// Função para mostrar/esconder modals e gerenciar estado
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
        } else if (modal === comparisonModal) {
            // Configurações específicas para o modal de comparação
            if (comparisonData) {
                if (comparisonData.startDate && comparisonData.endDate) {
                    document.querySelector('input[name="comparisonOption"][value="custom"]').checked = true;
                    document.getElementById('compareStartDate').value = comparisonData.startDate;
                    document.getElementById('compareEndDate').value = comparisonData.endDate;
                } else if (comparisonData.isPrevious) {
                    document.querySelector('input[name="comparisonOption"][value="previous"]').checked = true;
                } else {
                    document.querySelector('input[name="comparisonOption"][value="none"]').checked = true;
                }
            }
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
        } else if (modal === comparisonModal) {
            // Limpar dados de comparação ao fechar
            comparisonData = null;
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

// Função para criar e gerenciar opções clicáveis nos modals com valor gasto e pesquisa
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

            container.style.overflowY = 'auto';
            container.style.maxHeight = '400px';

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

        try {
            await loadCampaigns(unitId, startDate, endDate);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Delay de 2 segundos entre as chamadas
            await loadAdSets(unitId, startDate, endDate);
        } catch (error) {
            console.error('Erro ao carregar campanhas ou ad sets:', error);
        }
    }
});

// Função para carregar campanhas com paginação e controle de limite de taxa
async function loadCampaigns(unitId, startDate, endDate) {
    const startTime = performance.now();
    console.log(`Iniciando carregamento de campanhas para unitId: ${unitId}, período: ${startDate} a ${endDate}`);
    
    campaignsMap[unitId] = campaignsMap[unitId] || {};
    let nextPage = `/${unitId}/campaigns?fields=id,name&limit=100&access_token=${currentAccessToken}`;
    
    const loadMoreButton = document.createElement('button');
    loadMoreButton.textContent = 'Carregar mais';
    loadMoreButton.className = 'btn-filter';
    loadMoreButton.style.display = 'none';

    const campaignsList = document.getElementById('campaignsList');
    
    while (nextPage) {
        const campaignResponse = await new Promise(resolve => {
            FB.api(nextPage, resolve);
        });

        if (campaignResponse && !campaignResponse.error) {
            console.log(`Resposta da API para campanhas:`, campaignResponse);
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

            const campaignOptions = Object.keys(campaignsMap[unitId]).map(id => ({
                value: id,
                label: campaignsMap[unitId][id].name,
                spend: campaignsMap[unitId][id].insights.spend
            }));

            if (!isAdSetFilterActive) {
                renderOptions('campaignsList', campaignOptions, selectedCampaigns, true);
            }

            if (campaignResponse.paging && campaignResponse.paging.next) {
                nextPage = campaignResponse.paging.next;
                await new Promise(resolve => setTimeout(resolve, 2000)); // Delay de 2 segundos para respeitar o limite de taxa
                loadMoreButton.style.display = 'block';
                loadMoreButton.onclick = () => loadCampaigns(unitId, startDate, endDate);
                campaignsList.appendChild(loadMoreButton);
            } else {
                nextPage = null;
                loadMoreButton.style.display = 'none';
            }
        } else {
            console.error('Erro ao carregar campanhas:', campaignResponse.error);
            if (campaignResponse.error && campaignResponse.error.code === 17) {
                console.warn('Limite de requisições atingido durante o carregamento de campanhas.');
            }
            nextPage = null;
        }
    }

    const endTime = performance.now();
    console.log(`Carregamento de campanhas concluído em ${(endTime - startTime) / 1000} segundos`);
}

// Função para carregar ad sets com paginação e retry
async function loadAdSets(unitId, startDate, endDate) {
    const startTime = performance.now();
    console.log(`Iniciando carregamento de ad sets para unitId: ${unitId}, período: ${startDate} a ${endDate}`);
    
    adSetsMap[unitId] = {};
    let allAdSets = [];
    let url = `/${unitId}/adsets?fields=id,name,campaign{id}&access_token=${currentAccessToken}&limit=100`;

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
        const insightPromises = adSetIds.map(adSetId => getAdSetInsights(adSetId, startDate, endDate));
        const insights = await Promise.all(insightPromises);

        adSetIds.forEach((adSetId, index) => {
            const adSet = allAdSets.find(set => set.id === adSetId);
            adSetsMap[unitId][adSetId] = {
                name: adSet.name.toLowerCase(),
                campaignId: adSet.campaign ? adSet.campaign.id : null,
                insights: insights[index] || { spend: 0, actions: [], reach: 0 }
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

// Função para atualizar as opções de ad sets
function updateAdSets(selectedCampaigns) {
    const unitId = document.getElementById('unitId').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (unitId && startDate && endDate && !isAdSetFilterActive) {
        const validAdSetIds = Object.keys(adSetsMap[unitId] || {}).filter(id => 
            !selectedCampaigns.size || selectedCampaigns.has(adSetsMap[unitId][id].campaignId));
        const adSetOptions = validAdSetIds.map(id => ({
            value: id,
            label: adSetsMap[unitId][id].name,
            spend: adSetsMap[unitId][id].insights.spend
        }));
        renderOptions('adSetsList', adSetOptions, selectedAdSets, false);
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

// Função para calcular o período anterior automaticamente
function calculatePreviousPeriod(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);

    const previousEnd = new Date(start);
    previousEnd.setDate(previousEnd.getDate() - 1);

    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - diffDays);

    return {
        start: previousStart.toISOString().split('T')[0],
        end: previousEnd.toISOString().split('T')[0]
    };
}

// Configurar evento para o botão de comparação de períodos
comparePeriodsBtn.addEventListener('click', () => {
    if (isFilterActivated && (selectedCampaigns.size > 0 || selectedAdSets.size > 0)) return;
    toggleModal(comparisonModal, true, false);
});

confirmComparisonBtn.addEventListener('click', () => {
    const comparisonOption = document.querySelector('input[name="comparisonOption"]:checked');
    const compareStartDate = document.getElementById('compareStartDate').value;
    const compareEndDate = document.getElementById('compareEndDate').value;

    if (comparisonOption.value === 'custom' && (!compareStartDate || !compareEndDate)) {
        alert('Por favor, selecione um período personalizado válido.');
        return;
    }

    if (comparisonOption.value === 'previous') {
        const unitId = document.getElementById('unitId').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        comparisonData = calculatePreviousPeriod(startDate, endDate);
        comparisonData.isPrevious = true;
    } else if (comparisonOption.value === 'custom') {
        comparisonData = { startDate: compareStartDate, endDate: compareEndDate };
    } else {
        comparisonData = null;
    }
    toggleModal(comparisonModal, false, false);
    generateReport();
});

cancelComparisonBtn.addEventListener('click', () => {
    comparisonData = null;
    toggleModal(comparisonModal, false, false);
});

// Gerar o relatório completo
async function generateReport() {
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
    let adsMap = {};

    try {
        if (isFilterActivated) {
            if (selectedCampaigns.size > 0) {
                adsMap = await loadAds(unitId, startDate, endDate, selectedCampaigns);
            } else if (selectedAdSets.size > 0) {
                adsMap = await loadAds(unitId, startDate, endDate, null, selectedAdSets);
            }
        } else {
            adsMap = await loadAds(unitId, startDate, endDate);
        }

        Object.values(adsMap).forEach(ad => {
            if (ad.insights && ad.insights.spend) {
                totalSpend += parseFloat(ad.insights.spend) || 0;
            }
            if (ad.insights && ad.insights.reach) {
                totalReach += parseInt(ad.insights.reach) || 0;
            }
            (ad.insights.actions || []).forEach(action => {
                if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                    totalConversations += parseInt(action.value) || 0;
                }
            });
        });

        let comparisonText = '';
        if (comparisonData) {
            let comparisonSpend = 0;
            let comparisonConversations = 0;
            let comparisonReach = 0;
            let comparisonAdsMap = {};

            if (comparisonData.isPrevious) {
                comparisonAdsMap = await loadAds(unitId, comparisonData.start, comparisonData.end);
            } else if (comparisonData.startDate && comparisonData.endDate) {
                comparisonAdsMap = await loadAds(unitId, comparisonData.startDate, comparisonData.endDate);
            }

            Object.values(comparisonAdsMap).forEach(ad => {
                if (ad.insights && ad.insights.spend) {
                    comparisonSpend += parseFloat(ad.insights.spend) || 0;
                }
                if (ad.insights && ad.insights.reach) {
                    comparisonReach += parseInt(ad.insights.reach) || 0;
                }
                (ad.insights.actions || []).forEach(action => {
                    if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                        comparisonConversations += parseInt(action.value) || 0;
                    }
                });
            });

            const spendDiff = ((totalSpend - comparisonSpend) / comparisonSpend * 100).toFixed(2) || 0;
            const conversationDiff = ((totalConversations - comparisonConversations) / comparisonConversations * 100).toFixed(2) || 0;
            const reachDiff = ((totalReach - comparisonReach) / comparisonReach * 100).toFixed(2) || 0;

            comparisonText = `
                <h3>Comparação com Período Anterior (${comparisonData.start} a ${comparisonData.end || comparisonData.endDate}):</h3>
                <p>💰 Investimento: R$ ${comparisonSpend.toFixed(2).replace('.', ',')} (${spendDiff}%)</p>
                <p>💬 Mensagens: ${comparisonConversations} (${conversationDiff}%)</p>
                <p>📢 Alcance: ${comparisonReach.toLocaleString('pt-BR')} (${reachDiff}%)</p>
            `;
        }

        const costPerConversation = totalConversations > 0 ? (totalSpend / totalConversations).toFixed(2) : '0';
        reportContainer.innerHTML = `
            <h2>📊 RELATÓRIO COMPLETO - ${unitName}</h2>
            <p>📅 Período: ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}</p>
            <p>💰 Investimento Total: R$ ${totalSpend.toFixed(2).replace('.', ',')}</p>
            <p>💬 Mensagens Iniciadas: ${totalConversations}</p>
            <p>💵 Custo por Mensagem: R$ ${costPerConversation.replace('.', ',')}</p>
            <p>📢 Alcance Total: ${totalReach.toLocaleString('pt-BR')} pessoas</p>
            ${comparisonText}
            <div id="adsList"></div>
        `;

        const adsList = document.getElementById('adsList');
        for (const [adId, ad] of Object.entries(adsMap)) {
            const imageBase64 = ad.creative.imageUrl ? await fetchImageAsBase64(ad.creative.imageUrl) : null;
            const adDiv = document.createElement('div');
            adDiv.innerHTML = `
                <h4>Anúncio ID: ${adId}</h4>
                ${imageBase64 ? `<img src="${imageBase64}" alt="Imagem do Anúncio" style="max-width: 200px; max-height: 200px;">` : '<p>Imagem não disponível</p>'}
                <p>💰 Investimento: R$ ${(ad.insights.spend || 0).toFixed(2).replace('.', ',')}</p>
                <p>📢 Alcance: ${parseInt(ad.insights.reach || 0).toLocaleString('pt-BR')}</p>
                <p>💬 Mensagens: ${((ad.insights.actions || []).find(a => a.action_type === 'onsite_conversion.messaging_conversation_started_7d')?.value || 0)}</p>
            `;
            adsList.appendChild(adDiv);
        }

        exportPdfBtn.style.display = 'block';
        actionPlanSection.style.display = 'block';
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        reportContainer.innerHTML = `<p>Erro ao carregar os dados do relatório: ${error.message || 'Erro desconhecido'}. Tente novamente.</p>`;
        exportPdfBtn.style.display = 'none';
        actionPlanSection.style.display = 'none';
    }
}

// Configurar evento para o formulário
form.addEventListener('submit', (e) => {
    e.preventDefault();
    generateReport();
});

// Exportar para PDF (simplificado - usa html2pdf)
exportPdfBtn.addEventListener('click', () => {
    const element = reportContainer;
    html2pdf().from(element).save('Relatorio_Completo.pdf');
});

// Gerenciar plano de ação
submitActionPlanBtn.addEventListener('click', () => {
    const actionPlanText = actionPlanInput.value.trim();
    if (actionPlanText) {
        actionPlanResult.innerHTML = `<p>Plano de Ação Salvo: ${actionPlanText}</p>`;
        actionPlanInput.value = '';
    } else {
        actionPlanResult.innerHTML = '<p>Por favor, insira um plano de ação.</p>';
    }
});