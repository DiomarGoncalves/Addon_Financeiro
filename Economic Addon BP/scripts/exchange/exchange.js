import { world, system, ItemStack } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';

// Sistema de Casa de Câmbio
export class ExchangeSystem {
    constructor(economyCore) {
        this.core = economyCore;
        this.exchangeRates = new Map();
        this.dailyLimits = new Map();
        this.playerExchanges = new Map();
        
        this.initializeExchangeRates();
        this.setupEvents();
        this.loadExchangeData();
        
        world.sendMessage("§a[Exchange System] Casa de câmbio ativa!");
    }

    // Limpa todos os dados internos
    clearData() {
        this.exchangeRates.clear();
        this.dailyLimits.clear();
        this.playerExchanges.clear();
    }

    // Salva os dados no DynamicProperty
    saveExchangeData() {
        const data = {
            exchangeRates: Array.from(this.exchangeRates.entries()),
            dailyLimits: Array.from(this.dailyLimits.entries()),
            playerExchanges: Array.from(this.playerExchanges.entries()),
        };
        world.setDynamicProperty("exchangeSystemData", JSON.stringify(data));
    }

    // Carrega os dados do DynamicProperty
    loadExchangeData() {
        const dataStr = world.getDynamicProperty("exchangeSystemData");
        if (!dataStr) return;

        try {
            const data = JSON.parse(dataStr);
            this.exchangeRates = new Map(data.exchangeRates);
            this.dailyLimits = new Map(data.dailyLimits);
            this.playerExchanges = new Map(data.playerExchanges);
        } catch (e) {
            world.sendMessage("Erro ao carregar dados da casa de câmbio: " + e);
        }
    }

    setupEvents() {
        // Interação com NPC de câmbio
        if (world.beforeEvents?.playerInteractWithEntity) {
            world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
                const { player, target: entity } = event;
                
                if (entity.typeId !== "minecraft:npc") return;
                if (!entity.getTags().includes("exchangenpc")) return;
                
                event.cancel = true;
                system.run(() => this.openExchangeInterface(player));
            });
        }

        // Comandos de câmbio
        if (world.beforeEvents?.chatSend) {
            world.beforeEvents.chatSend.subscribe((event) => {
                const message = event.message.toLowerCase();
                const player = event.sender;
                
                if (message === "!cotacao") {
                    event.cancel = true;
                    this.showExchangeRates(player);
                }
                
                if (message === "!exchange-history") {
                    event.cancel = true;
                    this.showExchangeHistory(player);
                }
            });
        }
    }

    initializeExchangeRates() {
        // Minerais básicos
        this.setExchangeRate("minecraft:coal", 15, 1000);
        this.setExchangeRate("minecraft:iron_ingot", 75, 500);
        this.setExchangeRate("minecraft:gold_ingot", 150, 200);
        this.setExchangeRate("minecraft:diamond", 800, 50);
        this.setExchangeRate("minecraft:emerald", 600, 75);
        this.setExchangeRate("minecraft:netherite_ingot", 5000, 10);

        // Materiais especiais
        this.setExchangeRate("minecraft:redstone", 25, 2000);
        this.setExchangeRate("minecraft:lapis_lazuli", 30, 1500);
        this.setExchangeRate("minecraft:quartz", 40, 1000);
        this.setExchangeRate("minecraft:glowstone_dust", 50, 800);

        // Itens do Nether
        this.setExchangeRate("minecraft:blaze_rod", 200, 100);
        this.setExchangeRate("minecraft:ghast_tear", 400, 50);
        this.setExchangeRate("minecraft:nether_wart", 35, 500);
        this.setExchangeRate("minecraft:magma_cream", 80, 200);

        // Itens do End
        this.setExchangeRate("minecraft:ender_pearl", 300, 100);
        this.setExchangeRate("minecraft:chorus_fruit", 60, 300);
        this.setExchangeRate("minecraft:shulker_shell", 1500, 20);
        this.setExchangeRate("minecraft:dragon_breath", 2000, 5);

        // Itens raros
        this.setExchangeRate("minecraft:nether_star", 10000, 3);
        this.setExchangeRate("minecraft:totem_of_undying", 8000, 5);
        this.setExchangeRate("minecraft:elytra", 15000, 2);
        this.setExchangeRate("minecraft:beacon", 12000, 3);

        // Blocos valiosos
        this.setExchangeRate("minecraft:diamond_block", 7200, 20);
        this.setExchangeRate("minecraft:gold_block", 1350, 100);
        this.setExchangeRate("minecraft:iron_block", 675, 200);
        this.setExchangeRate("minecraft:emerald_block", 5400, 30);

        // Materiais de construção especiais
        this.setExchangeRate("minecraft:obsidian", 100, 500);
        this.setExchangeRate("minecraft:end_stone", 80, 300);
        this.setExchangeRate("minecraft:netherrack", 10, 2000);
        this.setExchangeRate("minecraft:prismarine", 120, 200);

        // Itens de farming
        this.setExchangeRate("minecraft:wheat", 5, 5000);
        this.setExchangeRate("minecraft:carrot", 8, 3000);
        this.setExchangeRate("minecraft:potato", 8, 3000);
        this.setExchangeRate("minecraft:beetroot", 10, 2000);
        this.setExchangeRate("minecraft:sugar_cane", 15, 1500);
        this.setExchangeRate("minecraft:pumpkin", 25, 1000);
        this.setExchangeRate("minecraft:melon", 20, 1200);

        // Itens de mob
        this.setExchangeRate("minecraft:bone", 20, 1000);
        this.setExchangeRate("minecraft:string", 15, 1500);
        this.setExchangeRate("minecraft:gunpowder", 45, 800);
        this.setExchangeRate("minecraft:spider_eye", 30, 600);
        this.setExchangeRate("minecraft:slime_ball", 60, 400);
        this.setExchangeRate("minecraft:phantom_membrane", 150, 100);
    }

    setExchangeRate(itemId, price, dailyLimit) {
        this.exchangeRates.set(itemId, {
            itemId: itemId,
            price: price,
            dailyLimit: dailyLimit,
            lastUpdate: new Date().toISOString(),
            fluctuation: 1.0 // Multiplicador de flutuação
        });
    }

    openExchangeInterface(player) {
        const balance = this.core.getWalletBalance(player.name);
        const todayExchanges = this.getTodayExchangeCount(player.name);
        
        const form = new ActionFormData()
            .title("§6§l💱 CASA DE CÂMBIO")
            .body(`§f§lBem-vindo à Casa de Câmbio!\n\n§7 Seu dinheiro: ${this.core.formatMoney(balance)}\n§7📊 Trocas hoje: §f${todayExchanges}\n\n§fServiços disponíveis:`)
            .button("§2§l VENDER MINERAIS\n§7Trocar minerais por dinheiro")
            .button("§e§l🔥 VENDER ITENS DO NETHER\n§7Materiais do Nether")
            .button("§d§l🌌 VENDER ITENS DO END\n§7Materiais do End")
            .button("§7🌾 VENDER PRODUTOS AGRÍCOLAS\n§7Itens de farming")
            .button("§c§l💀 VENDER DROPS DE MOBS\n§7Itens de criaturas")
            .button("§b§l VER COTAÇÕES\n§7Preços atuais")
            .button("§f§l📊 HISTÓRICO DE TROCAS\n§7Suas vendas anteriores");

        form.show(player).then((response) => {
            if (response.canceled) return;

            switch (response.selection) {
                case 0:
                    this.showMineralExchange(player);
                    break;
                case 1:
                    this.showNetherExchange(player);
                    break;
                case 2:
                    this.showEndExchange(player);
                    break;
                case 3:
                    this.showFarmingExchange(player);
                    break;
                case 4:
                    this.showMobDropExchange(player);
                    break;
                case 5:
                    this.showExchangeRates(player);
                    break;
                case 6:
                    this.showExchangeHistory(player);
                    break;
            }
        });
    }

    showMineralExchange(player) {
        const minerals = [
            "minecraft:coal", "minecraft:iron_ingot", "minecraft:gold_ingot",
            "minecraft:diamond", "minecraft:emerald", "minecraft:netherite_ingot",
            "minecraft:redstone", "minecraft:lapis_lazuli", "minecraft:quartz"
        ];
        
        this.showCategoryExchange(player, minerals, " MINERAIS", "Venda seus minerais por dinheiro!");
    }

    showNetherExchange(player) {
        const netherItems = [
            "minecraft:blaze_rod", "minecraft:ghast_tear", "minecraft:nether_wart",
            "minecraft:magma_cream", "minecraft:glowstone_dust", "minecraft:netherrack"
        ];
        
        this.showCategoryExchange(player, netherItems, "🔥 ITENS DO NETHER", "Materiais raros do Nether!");
    }

    showEndExchange(player) {
        const endItems = [
            "minecraft:ender_pearl", "minecraft:chorus_fruit", "minecraft:shulker_shell",
            "minecraft:dragon_breath", "minecraft:end_stone"
        ];
        
        this.showCategoryExchange(player, endItems, "🌌 ITENS DO END", "Materiais místicos do End!");
    }

    showFarmingExchange(player) {
        const farmItems = [
            "minecraft:wheat", "minecraft:carrot", "minecraft:potato",
            "minecraft:beetroot", "minecraft:sugar_cane", "minecraft:pumpkin", "minecraft:melon"
        ];
        
        this.showCategoryExchange(player, farmItems, "🌾 PRODUTOS AGRÍCOLAS", "Venda sua colheita!");
    }

    showMobDropExchange(player) {
        const mobDrops = [
            "minecraft:bone", "minecraft:string", "minecraft:gunpowder",
            "minecraft:spider_eye", "minecraft:slime_ball", "minecraft:phantom_membrane"
        ];
        
        this.showCategoryExchange(player, mobDrops, "💀 DROPS DE MOBS", "Itens de criaturas!");
    }

    showCategoryExchange(player, itemIds, categoryTitle, categoryDescription) {
        const inventory = player.getComponent("minecraft:inventory")?.container;
        if (!inventory) {
            player.sendMessage("§c Erro ao acessar inventário!");
            return;
        }

        const availableItems = [];
        
        for (const itemId of itemIds) {
            const count = this.countItemInInventory(inventory, itemId);
            if (count > 0) {
                const rate = this.exchangeRates.get(itemId);
                if (rate) {
                    availableItems.push({
                        itemId: itemId,
                        count: count,
                        rate: rate
                    });
                }
            }
        }

        if (availableItems.length === 0) {
            player.sendMessage(`§c Você não possui itens desta categoria para vender!`);
            return;
        }

        const form = new ActionFormData()
            .title(`§6§l💱 ${categoryTitle}`)
            .body(`§f${categoryDescription}\n\n§7Itens disponíveis no seu inventário:`);

        availableItems.forEach(item => {
            const itemName = this.getItemDisplayName(item.itemId);
            const currentPrice = this.getCurrentPrice(item.rate);
            const totalValue = currentPrice * item.count;
            
            form.button(`§f${itemName}\n§7${item.count}x | ${this.core.formatMoney(currentPrice)} cada | Total: ${this.core.formatMoney(totalValue)}`);
        });

        form.button("§c VOLTAR");

        form.show(player).then((response) => {
            if (response.canceled) return;

            if (response.selection === availableItems.length) {
                this.openExchangeInterface(player);
                return;
            }

            const selectedItem = availableItems[response.selection];
            this.showSellForm(player, selectedItem);
        });
    }

    showSellForm(player, itemData) {
        const itemName = this.getItemDisplayName(itemData.itemId);
        const currentPrice = this.getCurrentPrice(itemData.rate);
        const maxValue = currentPrice * itemData.count;
        const dailyLimit = this.getRemainingDailyLimit(player.name, itemData.itemId);
        const maxSellable = Math.min(itemData.count, dailyLimit);

        if (maxSellable <= 0) {
            player.sendMessage(`§c Limite diário atingido para ${itemName}!`);
            player.sendMessage(`§7Limite diário: ${itemData.rate.dailyLimit} itens`);
            return;
        }

        const form = new ModalFormData()
            .title(`§6§l💱 VENDER ${itemName.toUpperCase()}`)
            .textField(`§f§lItem: §e${itemName}\n§f§lPreço atual: ${this.core.formatMoney(currentPrice)} cada\n§f§lDisponível: §a${itemData.count}x\n§f§lLimite diário restante: §b${maxSellable}x\n\n§7Quantidade para vender:`, Math.min(maxSellable, itemData.count).toString(), "");

        form.show(player).then((response) => {
            if (response.canceled) return;

            const sellAmount = parseInt(response.formValues[0]);
            
            if (isNaN(sellAmount) || sellAmount <= 0) {
                player.sendMessage("§c Quantidade inválida!");
                return;
            }

            if (sellAmount > maxSellable) {
                player.sendMessage(`§c Quantidade excede o limite! Máximo: ${maxSellable}`);
                return;
            }

            if (sellAmount > itemData.count) {
                player.sendMessage(`§c Você não possui essa quantidade!`);
                return;
            }

            this.processSale(player, itemData.itemId, sellAmount, currentPrice);
        });
    }

    processSale(player, itemId, amount, unitPrice) {
        const inventory = player.getComponent("minecraft:inventory")?.container;
        if (!inventory) {
            player.sendMessage("§c Erro ao acessar inventário!");
            return;
        }

        // Verificar se ainda tem os itens
        const availableCount = this.countItemInInventory(inventory, itemId);
        if (availableCount < amount) {
            player.sendMessage("§c Itens insuficientes no inventário!");
            return;
        }

        // Remover itens do inventário
        let remaining = amount;
        for (let i = 0; i < inventory.size && remaining > 0; i++) {
            const item = inventory.getItem(i);
            if (item?.typeId === itemId) {
                const removeAmount = Math.min(remaining, item.amount);
                remaining -= removeAmount;

                if (removeAmount >= item.amount) {
                    inventory.setItem(i, undefined);
                } else {
                    const newItem = item.clone();
                    newItem.amount -= removeAmount;
                    inventory.setItem(i, newItem);
                }
            }
        }

        // Calcular valor total com possível bônus
        const baseValue = unitPrice * amount;
        let totalValue = baseValue;
        let bonusMessage = "";

        // Bônus por quantidade
        if (amount >= 64) {
            const bonus = Math.floor(baseValue * 0.1); // 10% de bônus
            totalValue += bonus;
            bonusMessage = `\n§a+${this.core.formatMoney(bonus)} bônus por quantidade!`;
        }

        // Adicionar dinheiro
        this.core.addMoney(player.name, totalValue, `Venda no câmbio: ${this.getItemDisplayName(itemId)}`);

        // Registrar venda
        this.recordExchange(player.name, itemId, amount, unitPrice, totalValue);

        // Atualizar limite diário
        this.updateDailyLimit(player.name, itemId, amount);

        // Mensagens de sucesso
        const itemName = this.getItemDisplayName(itemId);
        player.sendMessage(`§a Venda realizada com sucesso!`);
        player.sendMessage(`§7Item: §f${itemName} §7(${amount}x)`);
        player.sendMessage(`§7Preço unitário: ${this.core.formatMoney(unitPrice)}`);
        player.sendMessage(`§7Valor recebido: ${this.core.formatMoney(totalValue)}${bonusMessage}`);
        player.sendMessage(`§7Novo saldo: ${this.core.formatMoney(this.core.getWalletBalance(player.name))}`);

        // Atualizar flutuação de preços
        this.updatePriceFluctuation(itemId, amount);

        this.saveExchangeData();
    }

    showExchangeRates(player) {
        const categories = {
            " Minerais": ["minecraft:coal", "minecraft:iron_ingot", "minecraft:gold_ingot", "minecraft:diamond", "minecraft:emerald"],
            "🔥 Nether": ["minecraft:blaze_rod", "minecraft:ghast_tear", "minecraft:nether_wart", "minecraft:magma_cream"],
            "🌌 End": ["minecraft:ender_pearl", "minecraft:chorus_fruit", "minecraft:shulker_shell"],
            "🌾 Farming": ["minecraft:wheat", "minecraft:carrot", "minecraft:potato", "minecraft:sugar_cane"],
            "💀 Mob Drops": ["minecraft:bone", "minecraft:string", "minecraft:gunpowder", "minecraft:slime_ball"]
        };

        let ratesMessage = `§6§l=== 💱 COTAÇÕES ATUAIS ===\n\n`;

        for (const [categoryName, items] of Object.entries(categories)) {
            ratesMessage += `§f§l${categoryName}:\n`;
            
            for (const itemId of items) {
                const rate = this.exchangeRates.get(itemId);
                if (rate) {
                    const itemName = this.getItemDisplayName(itemId);
                    const currentPrice = this.getCurrentPrice(rate);
                    const trend = this.getPriceTrend(rate);
                    
                    ratesMessage += `§7• §f${itemName}: ${this.core.formatMoney(currentPrice)} ${trend}\n`;
                }
            }
            ratesMessage += "\n";
        }

        ratesMessage += `§7§lPreços atualizados automaticamente\n`;
        ratesMessage += `§7Flutuação baseada na oferta e demanda`;

        player.sendMessage(ratesMessage);
    }

    showExchangeHistory(player) {
        const exchanges = this.getPlayerExchanges(player.name);
        
        if (exchanges.length === 0) {
            player.sendMessage("§7Você ainda não fez nenhuma troca.");
            return;
        }

        let history = `§6§l=== 📊 HISTÓRICO DE TROCAS ===\n\n`;
        
        const recentExchanges = exchanges.slice(-10).reverse();
        let totalEarned = 0;

        recentExchanges.forEach((exchange, index) => {
            const date = new Date(exchange.timestamp).toLocaleDateString();
            const itemName = this.getItemDisplayName(exchange.itemId);
            
            history += `§f${index + 1}. §e${itemName} §7(${exchange.amount}x)\n`;
            history += `§7   ${this.core.formatMoney(exchange.totalValue)} - ${date}\n`;
            
            totalEarned += exchange.totalValue;
        });

        history += `\n§f§lTotal ganho: ${this.core.formatMoney(totalEarned)}`;
        history += `\n§7Trocas registradas: ${exchanges.length}`;

        player.sendMessage(history);
    }

    // === UTILITÁRIOS ===

    countItemInInventory(container, itemId) {
        let count = 0;
        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i);
            if (item?.typeId === itemId) {
                count += item.amount;
            }
        }
        return count;
    }

    getCurrentPrice(rate) {
        // Aplicar flutuação de preços
        return Math.floor(rate.price * rate.fluctuation);
    }

    getPriceTrend(rate) {
        if (rate.fluctuation > 1.05) return "§a📈";
        if (rate.fluctuation < 0.95) return "§c📉";
        return "§7➡";
    }

    updatePriceFluctuation(itemId, soldAmount) {
        const rate = this.exchangeRates.get(itemId);
        if (!rate) return;

        // Aumentar oferta diminui preço
        const impact = soldAmount / 1000; // Impacto baseado na quantidade
        rate.fluctuation = Math.max(0.5, Math.min(2.0, rate.fluctuation - impact));
        
        // Recuperação gradual para o preço base
        rate.fluctuation += (1.0 - rate.fluctuation) * 0.01;
    }

    getRemainingDailyLimit(playerName, itemId) {
        const today = new Date().toDateString();
        const playerLimits = this.dailyLimits.get(playerName) || new Map();
        const itemLimit = playerLimits.get(itemId) || { date: today, used: 0 };
        
        // Reset se for um novo dia
        if (itemLimit.date !== today) {
            itemLimit.date = today;
            itemLimit.used = 0;
        }

        const rate = this.exchangeRates.get(itemId);
        if (!rate) return 0;

        return Math.max(0, rate.dailyLimit - itemLimit.used);
    }

    updateDailyLimit(playerName, itemId, amount) {
        const today = new Date().toDateString();
        
        if (!this.dailyLimits.has(playerName)) {
            this.dailyLimits.set(playerName, new Map());
        }
        
        const playerLimits = this.dailyLimits.get(playerName);
        const itemLimit = playerLimits.get(itemId) || { date: today, used: 0 };
        
        if (itemLimit.date !== today) {
            itemLimit.date = today;
            itemLimit.used = 0;
        }
        
        itemLimit.used += amount;
        playerLimits.set(itemId, itemLimit);
    }

    getTodayExchangeCount(playerName) {
        const exchanges = this.getPlayerExchanges(playerName);
        const today = new Date().toDateString();
        
        return exchanges.filter(exchange => 
            new Date(exchange.timestamp).toDateString() === today
        ).length;
    }

    recordExchange(playerName, itemId, amount, unitPrice, totalValue) {
        if (!this.playerExchanges.has(playerName)) {
            this.playerExchanges.set(playerName, []);
        }

        const exchanges = this.playerExchanges.get(playerName);
        
        exchanges.push({
            id: `exchange_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            itemId: itemId,
            amount: amount,
            unitPrice: unitPrice,
            totalValue: totalValue,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString()
        });

        // Manter apenas as últimas 100 trocas
        if (exchanges.length > 100) {
            this.playerExchanges.set(playerName, exchanges.slice(-100));
        }
    }

    getPlayerExchanges(playerName) {
        return this.playerExchanges.get(playerName) || [];
    }

    getItemDisplayName(itemId) {
        const name = itemId.replace('minecraft:', '').replace(/_/g, ' ');
        return name.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    showExchangeHelp(player) {
        const help = `§6§l=== 💱 AJUDA - CASA DE CÂMBIO ===

§f§lComandos:
§7• §e/economy exchange §7- Abrir casa de câmbio
§7• §e!cotacao §7- Ver preços atuais
§7• §e!exchange-history §7- Histórico de vendas

§f§lNPCs:
§7• §aexchangenpc §7- Acesso ao câmbio

§f§lFuncionalidades:
§7• Venda itens por dinheiro
§7• Preços flutuam com oferta/demanda
§7• Limites diários por item
§7• Bônus por quantidade (64+ itens)
§7• Histórico detalhado de vendas

§f§lCategorias:
§7• §f Minerais §7- Carvão, ferro, ouro, diamante
§7• §f🔥 Nether §7- Blaze rod, lágrima de ghast
§7• §f🌌 End §7- Pérola do end, fruta chorus
§7• §f🌾 Farming §7- Trigo, cenoura, batata
§7• §f💀 Mob Drops §7- Osso, linha, pólvora

§f§lDicas:
§7• Preços mudam baseado na demanda
§7• Venda em grandes quantidades para bônus
§7• Verifique limites diários
§7• Monitore tendências de preços`;

        player.sendMessage(help);
    }

    // === PERSISTÊNCIA ===

    saveExchangeData() {
        try {
            const saveData = {
                exchangeRates: Array.from(this.exchangeRates.entries()),
                dailyLimits: Array.from(this.dailyLimits.entries()).map(([player, limits]) => [
                    player,
                    Array.from(limits.entries())
                ]),
                playerExchanges: Array.from(this.playerExchanges.entries()),
                timestamp: new Date().toISOString()
            };

            world.setDynamicProperty('exchangeSystemData', JSON.stringify(saveData));
        } catch (error) {
            world.sendMessage(`§c[Exchange System] Erro ao salvar: ${error}`);
        }
    }

    loadExchangeData() {
        try {
            const savedData = world.getDynamicProperty('exchangeSystemData');
            if (!savedData) return;

            const data = JSON.parse(savedData);
            
            if (data.exchangeRates) {
                // Mesclar taxas salvas com taxas padrão
                const savedRates = new Map(data.exchangeRates);
                for (const [itemId, rateData] of savedRates) {
                    if (this.exchangeRates.has(itemId)) {
                        // Manter apenas a flutuação, resetar outros valores
                        const existingRate = this.exchangeRates.get(itemId);
                        existingRate.fluctuation = rateData.fluctuation || 1.0;
                    }
                }
            }
            
            if (data.dailyLimits) {
                this.dailyLimits = new Map(data.dailyLimits.map(([player, limits]) => [
                    player,
                    new Map(limits)
                ]));
            }
            
            if (data.playerExchanges) {
                this.playerExchanges = new Map(data.playerExchanges);
            }

            world.sendMessage(`§a[Exchange System] Dados carregados: ${this.exchangeRates.size} itens`);
        } catch (error) {
            world.sendMessage(`§c[Exchange System] Erro ao carregar: ${error}`);
        }
    }
}