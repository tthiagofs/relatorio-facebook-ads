let currentAccessToken = localStorage.getItem('fbAccessToken');
let adAccountsMap = JSON.parse(localStorage.getItem('adAccountsMap')) || {};
let selectedCampaigns = new Set();
let selectedAdSets = new Set();
let campaignsMap = {};
let adSetsMap = {};
let isFilterActivated = false;
let comparisonData = null;

const form = document.getElementById('reportForm');
const reportContainer = document.getElementById('reportContainer');
const shareWhatsAppBtn = document.getElementById('shareWhatsAppBtn');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await generateReport();
});

async function loadUnits() {
    FB.api(
        '/me/adaccounts',
        { fields: 'id,name,account_id', access_token: currentAccessToken },
        function(response) {
            if (response && !response.error) {
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

async function loadCampaigns(unitId) {
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

async function loadAdSets(unitId) {
    FB.api(
        `/${unitId}/adsets`,
        { fields: 'id,name', limit: 100, access_token: currentAccessToken },
        async function(adSetResponse) {
            if (adSetResponse && !adSetResponse.error) {
                const adSetIds = adSetResponse.data.map(set => set.id);
                const startDate = document.getElementById('startDate').value || '2025-03-01';
                const endDate = document.getElementById('endDate').value || '2025-03-08';
                const insights = await Promise.all(adSetIds.map(adSetId => getAdSetInsights(adSetId, startDate, endDate)));
                adSetIds.forEach((adSetId, index) => {
                    let spend = parseFloat(insights[index].spend) || 0;
                    if (spend > 0) {
                        const adSet = adSetResponse.data.find(set => set.id === adSetId);
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
                console.error('Erro ao carregar ad sets:', adSetResponse.error);
            }
        }
    );
}

async function getAdSetInsights(adSetId, startDate, endDate) {
    return new Promise(resolve => {
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

async function loadAds(unitId, startDate, endDate, campaignFilter, adSetFilter) {
    const startTime = performance.now();
    const adsMap = {};
    let endpoint = `/${unitId}/ads`;

    if (campaignFilter && campaignFilter.size > 0) {
        campaignFilter.forEach(campaignId => {
            endpoint = `/${campaignId}/ads`;
            fetchAds(endpoint, adsMap, startDate, endDate);
        });
    } else if (adSetFilter && adSetFilter.size > 0) {
        adSetFilter.forEach(adSetId => {
            endpoint = `/${adSetId}/ads`;
            fetchAds(endpoint, adsMap, startDate, endDate);
        });
    } else {
        fetchAds(endpoint, adsMap, startDate, endDate);
    }

    async function fetchAds(endpoint, adsMap, startDate, endDate) {
        FB.api(
            endpoint,
            { fields: 'id,creative{id},insights{reach,spend,actions}', time_range: { since: startDate, until: endDate }, limit: 100, access_token: currentAccessToken },
            async function(response) {
                if (response && !response.error) {
                    for (const ad of response.data) {
                        const creative = await getCreativeData(ad.creative.id);
                        adsMap[ad.id] = {
                            creative: creative,
                            insights: ad.insights && ad.insights.data && ad.insights.data.length > 0 ? ad.insights.data[0] : { spend: 0, actions: [], reach: 0 }
                        };
                        console.log(`Insights para anúncio ${ad.id}:`, adsMap[ad.id].insights);
                    }
                } else {
                    console.error('Erro ao carregar anúncios:', response.error);
                }
                const endTime = performance.now();
                console.log(`Carregamento de anúncios concluído em ${(endTime - startTime) / 1000} segundos`);
            }
        );
    }

    return new Promise(resolve => {
        setTimeout(() => resolve(adsMap), 2000);
    });
}

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

function openFilterModal() {
    document.getElementById('filterModal').style.display = 'block';
}

function closeFilterModal() {
    document.getElementById('filterModal').style.display = 'none';
}

function applyFilters() {
    const campaignFilter = document.getElementById('campaignFilter');
    const adSetFilter = document.getElementById('adSetFilter');
    const compareStartDate = document.getElementById('compareStartDate').value;
    const compareEndDate = document.getElementById('compareEndDate').value;

    selectedCampaigns.clear();
    selectedAdSets.clear();

    Array.from(campaignFilter.selectedOptions).forEach(option => {
        selectedCampaigns.add(option.value);
    });

    Array.from(adSetFilter.selectedOptions).forEach(option => {
        selectedAdSets.add(option.value);
    });

    isFilterActivated = selectedCampaigns.size > 0 || selectedAdSets.size > 0;

    if (compareStartDate && compareEndDate) {
        comparisonData = { startDate: compareStartDate, endDate: compareEndDate };
    } else {
        comparisonData = null;
    }

    closeFilterModal();
}

function calculateVariation(current, previous) {
    if (previous === 0) return { percentage: 'N/A', icon: '' };
    const variation = ((current - previous) / previous) * 100;
    return {
        percentage: variation.toFixed(2),
        icon: variation >= 0 ? '↑' : '↓'
    };
}

async function getCampaignInsights(campaignId, startDate, endDate) {
    return new Promise(resolve => {
        FB.api(
            `/${campaignId}/insights`,
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
    let comparisonMetrics = null;
    let topAds = [];

    const adsMap = await loadAds(unitId, startDate, endDate, selectedCampaigns.size > 0 ? selectedCampaigns : null, selectedAdSets.size > 0 ? selectedAdSets : null);

    if (isFilterActivated) {
        if (selectedCampaigns.size > 0) {
            for (const campaignId of selectedCampaigns) {
                const insights = await getCampaignInsights(campaignId, startDate, endDate);
                if (insights && insights.spend) totalSpend += parseFloat(insights.spend) || 0;
                if (insights && insights.reach) totalReach += parseInt(insights.reach) || 0;
                (insights.actions || []).forEach(action => {
                    if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                        totalConversations += parseInt(action.value) || 0;
                    }
                });
            }
        } else if (selectedAdSets.size > 0) {
            for (const adSetId of selectedAdSets) {
                const insights = await getAdSetInsights(adSetId, startDate, endDate);
                if (insights && insights.spend) totalSpend += parseFloat(insights.spend) || 0;
                if (insights && insights.reach) totalReach += parseInt(insights.reach) || 0;
                (insights.actions || []).forEach(action => {
                    if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                        totalConversations += parseInt(action.value) || 0;
                    }
                });
            }
        }
    } else {
        const response = await new Promise(resolve => {
            FB.api(
                `/${unitId}/insights`,
                { fields: ['spend', 'actions', 'reach'], time_range: { since: startDate, until: endDate }, level: 'account', access_token: currentAccessToken },
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
            reportContainer.innerHTML = '<p>Nenhum dado encontrado para os filtros aplicados ou erro na requisição.</p>';
            if (response.error) console.error('Erro da API:', response.error);
            shareWhatsAppBtn.style.display = 'none';
            return;
        }
    }

    Object.keys(adsMap).forEach(adId => {
        const ad = adsMap[adId];
        let messages = 0;
        let spend = parseFloat(ad.insights.spend) || 0;
        (ad.insights.actions || []).forEach(action => {
            if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                messages += parseInt(action.value) || 0;
                console.log(`Anúncio ${adId} tem ${messages} mensagens iniciadas`);
            }
        });
        if (messages > 0) {
            topAds.push({
                imageUrl: ad.creative.imageUrl,
                messages: messages,
                costPerMessage: messages > 0 ? (spend / messages).toFixed(2) : '0'
            });
        } else {
            console.warn(`Anúncio ${adId} não tem mensagens iniciadas`);
        }
    });

    topAds.sort((a, b) => b.messages - a.messages);
    console.log('Top Ads antes do filtro:', topAds);
    const topTwoAds = topAds.slice(0, 2).filter(ad => {
        return ad.imageUrl && !ad.imageUrl.includes('dummyimage');
    });
    console.log('Top Ads depois do filtro:', topTwoAds);

    if (comparisonData && comparisonData.startDate && comparisonData.endDate) {
        let compareSpend = 0;
        let compareConversations = 0;
        let compareReach = 0;

        if (isFilterActivated) {
            if (selectedCampaigns.size > 0) {
                for (const campaignId of selectedCampaigns) {
                    const insights = await getCampaignInsights(campaignId, comparisonData.startDate, comparisonData.endDate);
                    if (insights && insights.spend) compareSpend += parseFloat(insights.spend) || 0;
                    if (insights && insights.reach) compareReach += parseInt(insights.reach) || 0;
                    (insights.actions || []).forEach(action => {
                        if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                            compareConversations += parseInt(action.value) || 0;
                        }
                    });
                }
            } else if (selectedAdSets.size > 0) {
                for (const adSetId of selectedAdSets) {
                    const insights = await getAdSetInsights(adSetId, comparisonData.startDate, comparisonData.endDate);
                    if (insights && insights.spend) compareSpend += parseFloat(insights.spend) || 0;
                    if (insights && insights.reach) compareReach += parseInt(insights.reach) || 0;
                    (insights.actions || []).forEach(action => {
                        if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                            compareConversations += parseInt(action.value) || 0;
                        }
                    });
                }
            }
        } else {
            const response = await new Promise(resolve => {
                FB.api(
                    `/${unitId}/insights`,
                    { fields: ['spend', 'actions', 'reach'], time_range: { since: comparisonData.startDate, until: comparisonData.endDate }, level: 'account', access_token: currentAccessToken },
                    resolve
                );
            });

            if (response && !response.error && response.data.length > 0) {
                response.data.forEach(data => {
                    if (data.spend) compareSpend += parseFloat(data.spend) || 0;
                    if (data.reach) compareReach += parseInt(data.reach) || 0;
                    (data.actions || []).forEach(action => {
                        if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                            compareConversations += parseInt(action.value) || 0;
                        }
                    });
                });
            }
        }

        const compareCostPerConversation = compareConversations > 0 ? (compareSpend / compareConversations).toFixed(2) : '0';
        comparisonMetrics = {
            reach: compareReach,
            conversations: compareConversations,
            costPerConversation: parseFloat(compareCostPerConversation)
        };
    }

    const costPerConversation = totalConversations > 0 ? (totalSpend / totalConversations).toFixed(2) : '0';

    let reportHTML = `
        <div class="report-header">
            <h2>Relatório Completo - CA - ${unitName}</h2>
            <p>📅 Período: ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}</p>
            ${comparisonData && comparisonData.startDate && comparisonData.endDate ? `<p>📅 Comparação: ${comparisonData.startDate.split('-').reverse().join('/')} a ${comparisonData.endDate.split('-').reverse().join('/')}</p>` : ''}
        </div>
        <div class="metrics-grid">
            <div class="metric-card reach">
                <div>
                    <div class="metric-label">Alcance Total</div>
                    <div class="metric-value">${totalReach.toLocaleString('pt-BR')} pessoas</div>
                    ${comparisonMetrics ? `
                        <div class="metric-comparison ${comparisonMetrics.reach <= totalReach ? 'increase' : 'decrease'}">
                            ${calculateVariation(totalReach, comparisonMetrics.reach).percentage}% ${calculateVariation(totalReach, comparisonMetrics.reach).icon}
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="metric-card messages">
                <div>
                    <div class="metric-label">Mensagens Iniciadas</div>
                    <div class="metric-value">${totalConversations}</div>
                    ${comparisonMetrics ? `
                        <div class="metric-comparison ${comparisonMetrics.conversations <= totalConversations ? 'increase' : 'decrease'}">
                            ${calculateVariation(totalConversations, comparisonMetrics.conversations).percentage}% ${calculateVariation(totalConversations, comparisonMetrics.conversations).icon}
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="metric-card cost">
                <div>
                    <div class="metric-label">Custo por Mensagem</div>
                    <div class="metric-value">R$ ${costPerConversation.replace('.', ',')}</div>
                    ${comparisonMetrics ? `
                        <div class="metric-comparison ${comparisonMetrics.costPerConversation >= parseFloat(costPerConversation) ? 'increase' : 'decrease'}">
                            ${calculateVariation(parseFloat(costPerConversation), comparisonMetrics.costPerConversation).percentage}% ${calculateVariation(parseFloat(costPerConversation), comparisonMetrics.costPerConversation).icon}
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="metric-card investment">
                <div>
                    <div class="metric-label">Investimento Total</div>
                    <div class="metric-value">R$ ${totalSpend.toFixed(2).replace('.', ',')}</div>
                </div>
            </div>
        </div>
        <div class="top-ads" style="margin-top: 20px;">
            <h3 style="color: #1e3c72;">Anúncios em Destaque</h3>
            ${topTwoAds.length > 0 ? topTwoAds.map(ad => `
                <div class="top-ad-card" style="display: flex; align-items: center; margin-bottom: 15px; background: #fff; padding: 10px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);">
                    <img src="${ad.imageUrl}" alt="Imagem do Anúncio" crossorigin="anonymous" loading="lazy" style="max-width: 300px; max-height: 300px; width: auto; height: auto; object-fit: contain; border-radius: 6px; margin-right: 15px;">
                    <div>
                        <div class="metric-value">Mensagens: ${ad.messages}</div>
                        <div class="metric-value">Custo por Msg: R$ ${ad.costPerMessage.replace('.', ',')}</div>
                    </div>
                </div>
            `).join('') : '<p>Nenhum anúncio com mensagens no período selecionado ou imagens de qualidade insuficiente.</p>'}
        </div>
    `;

    reportContainer.classList.add('complete');
    reportContainer.innerHTML = reportHTML;
    shareWhatsAppBtn.style.display = 'block';
}

function shareOnWhatsApp() {
    const reportContainer = document.getElementById('reportContainer');
    const text = reportContainer.innerText;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
}