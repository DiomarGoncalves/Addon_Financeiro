import { world, system, ItemStack } from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';

// Sistema de Lojas Completo
export class ShopSystem {
    constructor(economyCore) {
        this.core = economyCore;
        this.shops = new Map();
        this.shopCategories = new Map();
        this.playerPurchases = new Map();
        
        this.initializeDefaultShops();
        this.setupEvents();
        this.loadShopData();
        
        world.sendMessage("§a[Shop System] Sistema de lojas ativo!");
    }

    setupEvents() {
        // Interação com NPC de loja
        if (world.beforeEvents?.playerInteractWithEntity) {
            world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
                const { player, target: entity } = event;
                
                if (entity.typeId !== "minecraft:npc") return;
                if (!entity.getTags().includes("shopnpc")) return;
                
                event.cancel = true;
                system.run(() => this.openShopInterface(player, entity));
            });
        }
        // Removido: comandos de chat e admin
    }

    initializeDefaultShops() {
        // Loja Geral
        this.createShop("general_store", {
            name: "🏪 Loja Geral",
            description: "Tudo que você precisa para sobreviver!",
            categories: [
                {
                    name: "Ferramentas Básicas",
                    icon: "",
                    items: [
                        { id: "minecraft:wooden_pickaxe", count: 1, price: 50, stock: -1 },
                        { id: "minecraft:stone_pickaxe", count: 1, price: 150, stock: -1 },
                        { id: "minecraft:iron_pickaxe", count: 1, price: 500, stock: -1 },
                        { id: "minecraft:wooden_sword", count: 1, price: 40, stock: -1 },
                        { id: "minecraft:stone_sword", count: 1, price: 120, stock: -1 },
                        { id: "minecraft:iron_sword", count: 1, price: 400, stock: -1 }
                    ]
                },
                {
                    name: "Blocos de Construção",
                    icon: "",
                    items: [
                        { id: "minecraft:cobblestone", count: 64, price: 100, stock: -1 },
                        { id: "minecraft:stone", count: 64, price: 150, stock: -1 },
                        { id: "minecraft:oak_planks", count: 64, price: 200, stock: -1 },
                        { id: "minecraft:bricks", count: 32, price: 300, stock: -1 },
                        { id: "minecraft:glass", count: 32, price: 250, stock: -1 }
                    ]
                },
                {
                    name: "Comida e Consumíveis",
                    icon: "",
                    items: [
                        { id: "minecraft:bread", count: 16, price: 200, stock: -1 },
                        { id: "minecraft:cooked_beef", count: 8, price: 300, stock: -1 },
                        { id: "minecraft:apple", count: 12, price: 150, stock: -1 },
                        { id: "minecraft:golden_apple", count: 1, price: 1000, stock: 5 },
                        { id: "minecraft:milk_bucket", count: 1, price: 100, stock: -1 }
                    ]
                }
            ]
        });

        // Loja de Equipamentos
        this.createShop("equipment_store", {
            name: " Loja de Equipamentos",
            description: "Armas e armaduras para guerreiros!",
            categories: [
                {
                    name: "Armaduras de Couro",
                    icon: "",
                    items: [
                        { id: "minecraft:leather_helmet", count: 1, price: 100, stock: -1 },
                        { id: "minecraft:leather_chestplate", count: 1, price: 200, stock: -1 },
                        { id: "minecraft:leather_leggings", count: 1, price: 150, stock: -1 },
                        { id: "minecraft:leather_boots", count: 1, price: 80, stock: -1 }
                    ]
                },
                {
                    name: "Armaduras de Ferro",
                    icon: "",
                    items: [
                        { id: "minecraft:iron_helmet", count: 1, price: 800, stock: -1 },
                        { id: "minecraft:iron_chestplate", count: 1, price: 1200, stock: -1 },
                        { id: "minecraft:iron_leggings", count: 1, price: 1000, stock: -1 },
                        { id: "minecraft:iron_boots", count: 1, price: 600, stock: -1 }
                    ]
                },
                {
                    name: "Armas Especiais",
                    icon: "",
                    items: [
                        { id: "minecraft:bow", count: 1, price: 300, stock: -1 },
                        { id: "minecraft:crossbow", count: 1, price: 500, stock: -1 },
                        { id: "minecraft:arrow", count: 64, price: 200, stock: -1 },
                        { id: "minecraft:shield", count: 1, price: 400, stock: -1 }
                    ]
                }
            ]
        });

        // Loja de Materiais Raros
        this.createShop("rare_materials", {
            name: " Materiais Raros",
            description: "Itens especiais e difíceis de encontrar!",
            categories: [
                {
                    name: "Minerais Preciosos",
                    icon: "",
                    items: [
                        { id: "minecraft:diamond", count: 1, price: 2000, stock: 10 },
                        { id: "minecraft:emerald", count: 1, price: 1500, stock: 15 },
                        { id: "minecraft:gold_ingot", count: 1, price: 500, stock: -1 },
                        { id: "minecraft:iron_ingot", count: 1, price: 200, stock: -1 },
                        { id: "minecraft:netherite_ingot", count: 1, price: 10000, stock: 2 }
                    ]
                },
                {
                    name: "Itens do Nether",
                    icon: "",
                    items: [
                        { id: "minecraft:blaze_rod", count: 1, price: 800, stock: 20 },
                        { id: "minecraft:ghast_tear", count: 1, price: 1200, stock: 10 },
                        { id: "minecraft:nether_wart", count: 16, price: 400, stock: -1 },
                        { id: "minecraft:magma_cream", count: 4, price: 600, stock: 25 }
                    ]
                },
                {
                    name: "Itens do End",
                    icon: "",
                    items: [
                        { id: "minecraft:ender_pearl", count: 1, price: 1000, stock: 15 },
                        { id: "minecraft:end_stone", count: 32, price: 800, stock: -1 },
                        { id: "minecraft:chorus_fruit", count: 8, price: 500, stock: 30 },
                        { id: "minecraft:dragon_breath", count: 1, price: 5000, stock: 3 }
                    ]
                }
            ]
        });
    }

    createShop(shopId, shopData) {
        this.shops.set(shopId, {
            id: shopId,
            ...shopData,
            createdDate: new Date().toISOString(),
            totalSales: 0,
            totalRevenue: 0
        });
    }

    openShopInterface(player, npcEntity) {
        const shopId = this.getShopIdFromNPC(npcEntity);
        const shop = this.getShop(shopId);
        
        if (!shop) {
            player.sendMessage("§c Loja não encontrada!");
            return;
        }

        const balance = this.core.getWalletBalance(player.name);
        
        const form = new ActionFormData()
            .title(`${shop.name}`)
            .body(`§f${shop.description}\n\n§8 Seu dinheiro: ${this.core.formatMoney(balance)}\n\n§fCategorias disponíveis:`);

        shop.categories.forEach(category => {
            const availableItems = category.items.filter(item => item.stock !== 0).length;
            form.button(`§8${category.icon} ${category.name}\n§8${availableItems} itens disponíveis`);
        });

        form.button("§8 HISTÓRICO DE COMPRAS\n§8Ver suas compras anteriores");
        form.button("§8 OFERTAS ESPECIAIS\n§8Promoções e descontos");

        form.show(player).then((response) => {
            if (response.canceled) return;

            if (response.selection < shop.categories.length) {
                const category = shop.categories[response.selection];
                this.showCategoryItems(player, shop, category);
            } else if (response.selection === shop.categories.length) {
                this.showPurchaseHistory(player);
            } else {
                this.showSpecialOffers(player, shop);
            }
        });
    }

    showCategoryItems(player, shop, category) {
        const balance = this.core.getWalletBalance(player.name);
        
        const form = new ActionFormData()
            .title(`${shop.name} - ${category.name}`)
            .body(`§8Categoria: §f${category.name}\n§8 Seu dinheiro: ${this.core.formatMoney(balance)}\n\n§fItens disponíveis:`);

        category.items.forEach(item => {
            const itemName = this.getItemDisplayName(item.id);
            const stockText = item.stock === -1 ? "∞" : item.stock.toString();
            form.button(`§8${itemName}\n§8${this.core.formatMoney(item.price)} | ${item.count}x | Estoque: ${stockText}`);
        });

        form.button("§8⬅️ VOLTAR");

        form.show(player).then((response) => {
            if (response.canceled) return;

            if (response.selection === category.items.length) {
                this.openShopInterface(player, null); // Voltar (simplificado)
                return;
            }

            const item = category.items[response.selection];
            this.showPurchaseConfirmation(player, shop, item, category);
        });
    }

    showPurchaseConfirmation(player, shop, item, category) {
        const itemName = this.getItemDisplayName(item.id);
        const balance = this.core.getWalletBalance(player.name);
        
        // Verificações
        if (item.stock === 0) {
            player.sendMessage("§c Item fora de estoque!");
            return;
        }

        if (balance < item.price) {
            player.sendMessage(`§c Dinheiro insuficiente! Necessário: ${this.core.formatMoney(item.price)}`);
            return;
        }

        const form = new ModalFormData()
            .title("§6§l CONFIRMAR COMPRA")
            .textField(`§8Item: §e${itemName}\n§8Preço unitário: ${this.core.formatMoney(item.price)}\n§8Quantidade por compra: §a${item.count}x\n\n§8Seu dinheiro: ${this.core.formatMoney(balance)}\n\n§fQuantas unidades comprar?`, "1", "")
            .toggle("§8Compra em quantidade", false);

        form.show(player).then((response) => {
            if (response.canceled) return;

            const quantity = parseInt(response.formValues[0]) || 1;
            const bulkPurchase = response.formValues[1];
            
            if (quantity <= 0 || quantity > 64) {
                player.sendMessage("§c Quantidade inválida! (1-64)");
                return;
            }

            const totalPrice = item.price * quantity;
            const totalItems = item.count * quantity;

            if (balance < totalPrice) {
                player.sendMessage(`§c Dinheiro insuficiente! Total: ${this.core.formatMoney(totalPrice)}`);
                return;
            }

            if (item.stock !== -1 && item.stock < quantity) {
                player.sendMessage(`§c Estoque insuficiente! Disponível: ${item.stock}`);
                return;
            }

            this.processPurchase(player, shop, item, quantity, totalPrice, totalItems);
        });
    }

    processPurchase(player, shop, item, quantity, totalPrice, totalItems) {
        // Verificar inventário
        const inventory = player.getComponent("minecraft:inventory")?.container;
        if (!inventory) {
            player.sendMessage("§c Erro ao acessar inventário!");
            return;
        }

        // Verificar espaço no inventário
        const freeSlots = this.countFreeInventorySlots(inventory);
        const slotsNeeded = Math.ceil(totalItems / 64); // Assumindo stack máximo de 64

        if (freeSlots < slotsNeeded) {
            player.sendMessage(`§c Inventário cheio! Libere ${slotsNeeded - freeSlots} slots`);
            return;
        }

        // Processar pagamento
        if (!this.core.removeMoney(player.name, totalPrice, `Compra na ${shop.name}: ${this.getItemDisplayName(item.id)}`)) {
            player.sendMessage("§c Erro no pagamento!");
            return;
        }

        // Atualizar estoque
        if (item.stock !== -1) {
            item.stock -= quantity;
        }

        // Dar itens
        let remainingItems = totalItems;
        while (remainingItems > 0) {
            const stackSize = Math.min(remainingItems, 64);
            const itemStack = new ItemStack(item.id, stackSize);
            inventory.addItem(itemStack);
            remainingItems -= stackSize;
        }

        // Registrar compra
        this.recordPurchase(player.name, shop.id, item, quantity, totalPrice);

        // Atualizar estatísticas da loja
        shop.totalSales += quantity;
        shop.totalRevenue += totalPrice;

        // Mensagens de sucesso
        const itemName = this.getItemDisplayName(item.id);
        player.sendMessage(`§a Compra realizada com sucesso!`);
        player.sendMessage(`§8Item: §f${itemName} §8(${totalItems}x)`);
        player.sendMessage(`§8Valor pago: ${this.core.formatMoney(totalPrice)}`);
        player.sendMessage(`§8Saldo restante: ${this.core.formatMoney(this.core.getWalletBalance(player.name))}`);

        // Efeitos especiais para compras grandes
        if (totalPrice >= 10000) {
            player.sendMessage("§6 Compra VIP! Você ganhou pontos de fidelidade!");
            this.addLoyaltyPoints(player.name, Math.floor(totalPrice / 1000));
        }

        this.saveShopData();
    }

    showPurchaseHistory(player) {
        const purchases = this.getPlayerPurchases(player.name);
        
        if (purchases.length === 0) {
            player.sendMessage("§8Você ainda não fez nenhuma compra.");
            return;
        }

        let history = `§6§l===  HISTÓRICO DE COMPRAS ===\n\n`;
        
        const recentPurchases = purchases.slice(-10).reverse();
        let totalSpent = 0;

        recentPurchases.forEach((purchase, index) => {
            const date = new Date(purchase.timestamp).toLocaleDateString();
            const itemName = this.getItemDisplayName(purchase.itemId);
            
            history += `§f${index + 1}. §e${itemName} §8(${purchase.totalItems}x)\n`;
            history += `§8   ${this.core.formatMoney(purchase.totalPrice)} - ${purchase.shopName} - ${date}\n`;
            
            totalSpent += purchase.totalPrice;
        });

        history += `\n§8Total gasto: ${this.core.formatMoney(totalSpent)}`;
        history += `\n§8Compras registradas: ${purchases.length}`;

        player.sendMessage(history);
    }

    showSpecialOffers(player, shop) {
        const offers = this.generateSpecialOffers(shop);
        
        if (offers.length === 0) {
            player.sendMessage("§8Nenhuma oferta especial disponível no momento.");
            return;
        }

        const form = new ActionFormData()
            .title("§b OFERTAS ESPECIAIS")
            .body(`§8Promoções exclusivas da ${shop.name}!\n\n§8Aproveite enquanto durar:`);

        offers.forEach(offer => {
            const itemName = this.getItemDisplayName(offer.itemId);
            const discount = Math.round((1 - offer.discountPrice / offer.originalPrice) * 100);
            form.button(`§8${discount}% OFF ${itemName}\n§8De ${this.core.formatMoney(offer.originalPrice)} por ${this.core.formatMoney(offer.discountPrice)}`);
        });

        form.button("§8⬅️ VOLTAR");

        form.show(player).then((response) => {
            if (response.canceled) return;

            if (response.selection === offers.length) {
                this.openShopInterface(player, null);
                return;
            }

            const offer = offers[response.selection];
            this.showOfferPurchase(player, shop, offer);
        });
    }

    showOfferPurchase(player, shop, offer) {
        const itemName = this.getItemDisplayName(offer.itemId);
        const balance = this.core.getWalletBalance(player.name);
        const discount = Math.round((1 - offer.discountPrice / offer.originalPrice) * 100);

        const form = new MessageFormData()
            .title("§b OFERTA ESPECIAL")
            .body(`§8 PROMOÇÃO ESPECIAL!\n\n§8Item: §f${itemName}\n§8Quantidade: §a${offer.count}x\n§8Preço normal: §c${this.core.formatMoney(offer.originalPrice)}\n§8Preço promocional: §a${this.core.formatMoney(offer.discountPrice)}\n§8Desconto: §e${discount}%\n\n§8Seu dinheiro: ${this.core.formatMoney(balance)}\n\n§fAproveitar esta oferta?`)
            .button1("§a✅ COMPRAR")
            .button2("§c CANCELAR");

        form.show(player).then((response) => {
            if (response.canceled || response.selection === 1) return;

            if (balance < offer.discountPrice) {
                player.sendMessage(`§c Dinheiro insuficiente! Necessário: ${this.core.formatMoney(offer.discountPrice)}`);
                return;
            }

            // Processar compra da oferta
            const inventory = player.getComponent("minecraft:inventory")?.container;
            if (!inventory) {
                player.sendMessage("§c Erro ao acessar inventário!");
                return;
            }

            if (!this.core.removeMoney(player.name, offer.discountPrice, `Oferta especial: ${itemName}`)) {
                player.sendMessage("§c Erro no pagamento!");
                return;
            }

            const itemStack = new ItemStack(offer.itemId, offer.count);
            inventory.addItem(itemStack);

            player.sendMessage(`§a✅ Oferta aproveitada com sucesso!`);
            player.sendMessage(`§8Item: §f${itemName} §8(${offer.count}x)`);
            player.sendMessage(`§8Economia: ${this.core.formatMoney(offer.originalPrice - offer.discountPrice)}`);
            player.sendMessage(`§8Valor pago: ${this.core.formatMoney(offer.discountPrice)}`);

            // Registrar compra especial
            this.recordPurchase(player.name, shop.id, {
                id: offer.itemId,
                count: offer.count,
                price: offer.discountPrice
            }, 1, offer.discountPrice, true);
        });
    }

    generateSpecialOffers(shop) {
        const offers = [];
        const currentHour = new Date().getHours();
        
        // Ofertas baseadas no horário
        shop.categories.forEach(category => {
            category.items.forEach(item => {
                // 20% de chance de ter oferta
                if (Math.random() < 0.2) {
                    const discountPercent = 0.1 + Math.random() * 0.4; // 10% a 50% de desconto
                    const discountPrice = Math.floor(item.price * (1 - discountPercent));
                    
                    offers.push({
                        itemId: item.id,
                        count: item.count,
                        originalPrice: item.price,
                        discountPrice: discountPrice,
                        validUntil: Date.now() + (60 * 60 * 1000) // 1 hora
                    });
                }
            });
        });

        return offers.slice(0, 5); // Máximo 5 ofertas
    }

    openNearestShop(player) {
        // Simplificado - abrir loja geral
        const generalShop = this.shops.get("general_store");
        if (generalShop) {
            this.openShopInterface(player, null);
        } else {
            player.sendMessage("§c Nenhuma loja encontrada!");
        }
    }

    // === UTILITÁRIOS ===

    getShopIdFromNPC(npcEntity) {
        const tags = npcEntity.getTags();
        
        // Procurar por tags específicas de loja
        for (const tag of tags) {
            if (tag.startsWith("shop:")) {
                return tag.replace("shop:", "");
            }
        }
        
        // Usar posição como fallback
        const pos = npcEntity.location;
        return `shop_${Math.floor(pos.x)}_${Math.floor(pos.y)}_${Math.floor(pos.z)}`;
    }

    getShop(shopId) {
        return this.shops.get(shopId) || this.shops.get("general_store");
    }

    getItemDisplayName(itemId) {
        const name = itemId.replace('minecraft:', '').replace(/_/g, ' ');
        return name.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    countFreeInventorySlots(container) {
        let freeSlots = 0;
        for (let i = 0; i < container.size; i++) {
            if (!container.getItem(i)) {
                freeSlots++;
            }
        }
        return freeSlots;
    }

    recordPurchase(playerName, shopId, item, quantity, totalPrice, isSpecialOffer = false) {
        if (!this.playerPurchases.has(playerName)) {
            this.playerPurchases.set(playerName, []);
        }

        const purchases = this.playerPurchases.get(playerName);
        const shop = this.shops.get(shopId);

        purchases.push({
            id: `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            shopId: shopId,
            shopName: shop ? shop.name : "Loja Desconhecida",
            itemId: item.id,
            quantity: quantity,
            totalItems: item.count * quantity,
            unitPrice: item.price,
            totalPrice: totalPrice,
            isSpecialOffer: isSpecialOffer,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString()
        });

        // Manter apenas as últimas 50 compras
        if (purchases.length > 50) {
            this.playerPurchases.set(playerName, purchases.slice(-50));
        }
    }

    getPlayerPurchases(playerName) {
        return this.playerPurchases.get(playerName) || [];
    }

    addLoyaltyPoints(playerName, points) {
        // Sistema de fidelidade simples
        const currentPoints = this.core.getPlayerData(playerName).loyaltyPoints || 0;
        this.core.getPlayerData(playerName).loyaltyPoints = currentPoints + points;
    }

    handleCreateShopCommand(player, message) {
        // Função desativada, criação de loja só por código ou menu admin
        player.sendMessage("§c Criação de loja por comando desativada. Use menus de NPC ou peça ao administrador.");
    }

    showShopHelp(player) {
        // Atualize para explicar uso por NPC
        const help = `§6§l=== 🏪 AJUDA - SISTEMA DE LOJAS ===

§8NPCs:
§8• §ashopnpc §8- Acesso às lojas
§8• Tags especiais: §ashop:loja_id

§8Funcionalidades:
§8• Múltiplas categorias de itens
§8• Sistema de estoque limitado
§8• Ofertas especiais por tempo limitado
§8• Histórico de compras detalhado
§8• Pontos de fidelidade para compras grandes

§8Tipos de Loja:
§8• §f🏪 Loja Geral §8- Itens básicos
§8• §f Equipamentos §8- Armas e armaduras
§8• §f Materiais Raros §8- Itens especiais

§8Dicas:
§8• Verifique ofertas especiais regularmente
§8• Compras grandes dão pontos de fidelidade
§8• Alguns itens têm estoque limitado

§8Como usar:
§8• Interaja com NPCs com tag "shopnpc" para abrir o menu da loja.
§8• Escolha categoria, item e confirme a compra pelo menu UI.`;
        player.sendMessage(help);
    }

    // === PERSISTÊNCIA ===

    saveShopData() {
        try {
            const saveData = {
                shops: Array.from(this.shops.entries()),
                playerPurchases: Array.from(this.playerPurchases.entries()),
                timestamp: new Date().toISOString()
            };

            world.setDynamicProperty('shopSystemData', JSON.stringify(saveData));
        } catch (error) {
            world.sendMessage(`§c[Shop System] Erro ao salvar: ${error}`);
        }
    }

    loadShopData() {
        try {
            const savedData = world.getDynamicProperty('shopSystemData');
            if (!savedData) return;

            const data = JSON.parse(savedData);
            
            if (data.shops) {
                // Mesclar lojas salvas com lojas padrão
                const savedShops = new Map(data.shops);
                for (const [shopId, shopData] of savedShops) {
                    if (this.shops.has(shopId)) {
                        // Atualizar apenas estatísticas, manter itens padrão
                        const existingShop = this.shops.get(shopId);
                        existingShop.totalSales = shopData.totalSales || 0;
                        existingShop.totalRevenue = shopData.totalRevenue || 0;
                    } else {
                        this.shops.set(shopId, shopData);
                    }
                }
            }
            
            if (data.playerPurchases) {
                this.playerPurchases = new Map(data.playerPurchases);
            }

            world.sendMessage(`§a[Shop System] Dados carregados: ${this.shops.size} lojas`);
        } catch (error) {
            world.sendMessage(`§c[Shop System] Erro ao carregar: ${error}`);
        }
    }
}