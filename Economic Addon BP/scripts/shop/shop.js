import { world, system, ItemStack } from "@minecraft/server";
import {
  ActionFormData,
  ModalFormData,
  MessageFormData,
} from "@minecraft/server-ui";

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

  // Método para resetar todos os dados internos
  clearData() {
    this.shops.clear();
    this.shopCategories.clear();
    this.playerPurchases.clear();
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

    // Comandos de loja
    if (world.beforeEvents?.chatSend) {
      world.beforeEvents.chatSend.subscribe((event) => {
        const message = event.message.toLowerCase();
        const player = event.sender;

        if (message === "!purchases" || message === "!compras") {
          event.cancel = true;
          this.showPurchaseHistory(player);
        }

        // Comandos de admin
        if (message.startsWith("!shop-create ") && player.hasTag("admin")) {
          event.cancel = true;
          this.handleCreateShopCommand(player, message);
        }
      });
    }
  }

  initializeDefaultShops() {
    // Loja Geral
    this.createShop("general_store", {
      name: " Loja Geral",
      description: "Tudo que você precisa para sobreviver!",
      categories: [
        {
          name: "Ferramentas Básicas",
          textura: "textures/items/netherite_pickaxe",
          items: [
            {
              id: "minecraft:wooden_pickaxe",
              count: 1,
              price: 50,
              stock: -1,
              textura: "textures/items/wooden_pickaxe",
            },
            {
              id: "minecraft:stone_pickaxe",
              count: 1,
              price: 150,
              stock: -1,
              textura: "textures/items/stone_pickaxe",
            },
            {
              id: "minecraft:iron_pickaxe",
              count: 1,
              price: 500,
              stock: -1,
              textura: "textures/items/iron_pickaxe",
            },
            {
              id: "minecraft:wooden_sword",
              count: 1,
              price: 40,
              stock: -1,
              textura: "textures/items/wooden_sword",
            },
            {
              id: "minecraft:stone_sword",
              count: 1,
              price: 120,
              stock: -1,
              textura: "textures/items/stone_sword",
            },
            {
              id: "minecraft:iron_sword",
              count: 1,
              price: 400,
              stock: -1,
              textura: "textures/items/iron_sword",
            },
          ],
        },
        {
          name: "Blocos de Construção",
          textura: "textures/blocks/stone",
          items: [
            {
              id: "minecraft:cobblestone",
              count: 64,
              price: 100,
              stock: -1,
              textura: "textures/blocks/cobblestone",
            },
            {
              id: "minecraft:stone",
              count: 64,
              price: 150,
              stock: -1,
              textura: "textures/blocks/stone",
            },
            {
              id: "minecraft:oak_planks",
              count: 64,
              price: 200,
              stock: -1,
              textura: "textures/blocks/oak_planks",
            },
            {
              id: "minecraft:bricks",
              count: 32,
              price: 300,
              stock: -1,
              textura: "textures/blocks/bricks",
            },
            {
              id: "minecraft:glass",
              count: 32,
              price: 250,
              stock: -1,
              textura: "textures/blocks/glass",
            },
          ],
        },
        {
          name: "Comida e Consumíveis",
          textura: "textures/items/apple",
          items: [
            {
              id: "minecraft:bread",
              count: 16,
              price: 200,
              stock: -1,
              textura: "textures/items/bread",
            },
            {
              id: "minecraft:cooked_beef",
              count: 8,
              price: 300,
              stock: -1,
              textura: "textures/items/cooked_beef",
            },
            {
              id: "minecraft:apple",
              count: 12,
              price: 150,
              stock: -1,
              textura: "textures/items/apple",
            },
            {
              id: "minecraft:golden_apple",
              count: 1,
              price: 1000,
              stock: 5,
              textura: "textures/items/golden_apple",
            },
            {
              id: "minecraft:milk_bucket",
              count: 1,
              price: 100,
              stock: -1,
              textura: "textures/items/milk_bucket",
            },
          ],
        },
      ],
    });

    // Loja de Equipamentos
    this.createShop("equipment_store", {
      name: " Loja de Equipamentos",
      description: "Armas e armaduras para guerreiros!",
      categories: [
        {
          name: "Armaduras de Couro",
          textura: "textures/items/leather_chestplate",
          items: [
            {
              id: "minecraft:leather_helmet",
              count: 1,
              price: 100,
              stock: -1,
              textura: "textures/items/leather_helmet",
            },
            {
              id: "minecraft:leather_chestplate",
              count: 1,
              price: 200,
              stock: -1,
              textura: "textures/items/leather_chestplate",
            },
            {
              id: "minecraft:leather_leggings",
              count: 1,
              price: 150,
              stock: -1,
              textura: "textures/items/leather_leggings",
            },
            {
              id: "minecraft:leather_boots",
              count: 1,
              price: 80,
              stock: -1,
              textura: "textures/items/leather_boots",
            },
          ],
        },
        {
          name: "Armaduras de Ferro",
          textura: "textures/items/iron_chestplate",
          items: [
            {
              id: "minecraft:iron_helmet",
              count: 1,
              price: 800,
              stock: -1,
              textura: "textures/items/iron_helmet",
            },
            {
              id: "minecraft:iron_chestplate",
              count: 1,
              price: 1200,
              stock: -1,
              textura: "textures/items/iron_chestplate",
            },
            {
              id: "minecraft:iron_leggings",
              count: 1,
              price: 1000,
              stock: -1,
              textura: "textures/items/iron_leggings",
            },
            {
              id: "minecraft:iron_boots",
              count: 1,
              price: 600,
              stock: -1,
              textura: "textures/items/iron_boots",
            },
          ],
        },
        {
          name: "Armas Especiais",
          textura: "textures/items/netherite_sword",
          items: [
            {
              id: "minecraft:bow",
              count: 1,
              price: 300,
              stock: -1,
              textura: "textures/items/bow",
            },
            {
              id: "minecraft:crossbow",
              count: 1,
              price: 500,
              stock: -1,
              textura: "textures/items/crossbow",
            },
            {
              id: "minecraft:arrow",
              count: 64,
              price: 200,
              stock: -1,
              textura: "textures/items/arrow",
            },
            {
              id: "minecraft:shield",
              count: 1,
              price: 400,
              stock: -1,
              textura: "textures/items/shield",
            },
          ],
        },
      ],
    });

    // Loja de Materiais Raros
    this.createShop("rare_materials", {
      name: " Materiais Raros",
      description: "Itens especiais e difíceis de encontrar!",
      categories: [
        {
          name: "Minerais Preciosos",
          textura: "textures/items/diamond",
          items: [
            {
              id: "minecraft:diamond",
              count: 1,
              price: 2000,
              stock: 10,
              textura: "textures/items/diamond",
            },
            {
              id: "minecraft:emerald",
              count: 1,
              price: 1500,
              stock: 15,
              textura: "textures/items/emerald",
            },
            {
              id: "minecraft:gold_ingot",
              count: 1,
              price: 500,
              stock: -1,
              textura: "textures/items/gold_ingot",
            },
            {
              id: "minecraft:iron_ingot",
              count: 1,
              price: 200,
              stock: -1,
              textura: "textures/items/iron_ingot",
            },
            {
              id: "minecraft:netherite_ingot",
              count: 1,
              price: 10000,
              stock: 2,
              textura: "textures/items/netherite_ingot",
            },
          ],
        },
        {
          name: "Itens do Nether",
          textura: "textures/items/blaze_rod",
          items: [
            {
              id: "minecraft:blaze_rod",
              count: 1,
              price: 800,
              stock: 20,
              textura: "textures/items/blaze_rod",
            },
            {
              id: "minecraft:ghast_tear",
              count: 1,
              price: 1200,
              stock: 10,
              textura: "textures/items/ghast_tear",
            },
            {
              id: "minecraft:nether_wart",
              count: 16,
              price: 400,
              stock: -1,
              textura: "textures/items/nether_wart",
            },
            {
              id: "minecraft:magma_cream",
              count: 4,
              price: 600,
              stock: 25,
              textura: "textures/items/magma_cream",
            },
          ],
        },
        {
          name: "Itens do End",
          textura: "textures/items/ender_pearl",
          items: [
            {
              id: "minecraft:ender_pearl",
              count: 1,
              price: 1000,
              stock: 15,
              textura: "textures/items/ender_pearl",
            },
            {
              id: "minecraft:end_stone",
              count: 32,
              price: 800,
              stock: -1,
              textura: "textures/blocks/end_stone",
            },
            {
              id: "minecraft:chorus_fruit",
              count: 8,
              price: 500,
              stock: 30,
              textura: "textures/items/chorus_fruit",
            },
            {
              id: "minecraft:dragon_breath",
              count: 1,
              price: 5000,
              stock: 3,
              textura: "textures/items/dragon_breath",
            },
          ],
        },
      ],
    });
  }

  createShop(shopId, shopData) {
    this.shops.set(shopId, {
      id: shopId,
      ...shopData,
      createdDate: new Date().toISOString(),
      totalSales: 0,
      totalRevenue: 0,
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
      .body(
        `§f${shop.description}\n\n§7 Seu dinheiro: ${this.core.formatMoney(
          balance
        )}\n\n§fCategorias disponíveis:`
      );

    shop.categories.forEach((category) => {
      const availableItems = category.items.filter(
        (item) => item.stock !== 0
      ).length;
      form.button(
        `§f${category.name}\n§8${availableItems} itens disponíveis`,
        category.textura || "textures/ui/icon_import"
      );
    });

    form.button("§7histórico de compras\nver suas compras anteriores");
    form.button("§7ofertas especiais\npromoções e descontos");

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
      .body(
        `§7Categoria: §f${
          category.name
        }\n§7 Seu dinheiro: ${this.core.formatMoney(
          balance
        )}\n\n§fItens disponíveis:`
      );

    category.items.forEach((item) => {
      const itemName = this.getItemDisplayName(item.id);
      const stockText = item.stock === -1 ? "∞" : item.stock.toString();
      const canAfford = balance >= item.price;
      const inStock = item.stock !== 0;

      const statustextura = !inStock ? "§c" : !canAfford ? "§e" : "§a";

      // Aqui usamos item.textura se existir, ou fallback
      const iconTexture = item.textura || "textures/ui/icon_import";

      form.button(
        `${statustextura} §f${itemName}\n§7${this.core.formatMoney(
          item.price
        )} §8| ${item.count}x | Estoque: ${stockText}`,
        iconTexture
      );
    });

    form.button("§7voltar");

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
      player.sendMessage(
        `§c Dinheiro insuficiente! Necessário: ${this.core.formatMoney(
          item.price
        )}`
      );
      return;
    }

    const form = new ModalFormData()
      .title("§7confirmar compra")
      .textField(
        `§f§lItem: §e${itemName}\n§f§lPreço unitário: ${this.core.formatMoney(
          item.price
        )}\n§f§lQuantidade por compra: §a${
          item.count
        }x\n\n§7Seu dinheiro: ${this.core.formatMoney(
          balance
        )}\n\n§fQuantas unidades comprar?`,
        "1",
        ""
      )
      .toggle("§7compra em quantidade", false);

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
        player.sendMessage(
          `§c Dinheiro insuficiente! Total: ${this.core.formatMoney(
            totalPrice
          )}`
        );
        return;
      }

      if (item.stock !== -1 && item.stock < quantity) {
        player.sendMessage(
          `§c Estoque insuficiente! Disponível: ${item.stock}`
        );
        return;
      }

      this.processPurchase(
        player,
        shop,
        item,
        quantity,
        totalPrice,
        totalItems
      );
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
      player.sendMessage(
        `§c Inventário cheio! Libere ${slotsNeeded - freeSlots} slots`
      );
      return;
    }

    // Processar pagamento
    if (
      !this.core.removeMoney(
        player.name,
        totalPrice,
        `Compra na ${shop.name}: ${this.getItemDisplayName(item.id)}`
      )
    ) {
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
    player.sendMessage(`§7Item: §f${itemName} §7(${totalItems}x)`);
    player.sendMessage(`§7Valor pago: ${this.core.formatMoney(totalPrice)}`);
    player.sendMessage(
      `§7Saldo restante: ${this.core.formatMoney(
        this.core.getWalletBalance(player.name)
      )}`
    );

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
      player.sendMessage("§7Você ainda não fez nenhuma compra.");
      return;
    }

    let history = `§6§l===  HISTÓRICO DE COMPRAS ===\n\n`;

    const recentPurchases = purchases.slice(-10).reverse();
    let totalSpent = 0;

    recentPurchases.forEach((purchase, index) => {
      const date = new Date(purchase.timestamp).toLocaleDateString();
      const itemName = this.getItemDisplayName(purchase.itemId);

      history += `§f${index + 1}. §e${itemName} §7(${purchase.totalItems}x)\n`;
      history += `§7   ${this.core.formatMoney(purchase.totalPrice)} - ${
        purchase.shopName
      } - ${date}\n`;

      totalSpent += purchase.totalPrice;
    });

    history += `\n§f§lTotal gasto: ${this.core.formatMoney(totalSpent)}`;
    history += `\n§7Compras registradas: ${purchases.length}`;

    player.sendMessage(history);
  }

  showSpecialOffers(player, shop) {
    const offers = this.generateSpecialOffers(shop);

    if (offers.length === 0) {
      player.sendMessage("§7Nenhuma oferta especial disponível no momento.");
      return;
    }

    const form = new ActionFormData()
      .title("§7ofertas especiais")
      .body(
        `§f§lPromoções exclusivas da ${shop.name}!\n\n§7Aproveite enquanto durar:`
      );

    offers.forEach((offer) => {
      const itemName = this.getItemDisplayName(offer.itemId);
      const discount = Math.round(
        (1 - offer.discountPrice / offer.originalPrice) * 100
      );

      form.button(
        `§a${discount}% OFF §f${itemName}\n§7De ${this.core.formatMoney(
          offer.originalPrice
        )} por ${this.core.formatMoney(offer.discountPrice)}`
      );
    });

    form.button("§7voltar");

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
    const discount = Math.round(
      (1 - offer.discountPrice / offer.originalPrice) * 100
    );

    const form = new MessageFormData()
      .title("§7oferta especial")
      .body(
        `§f§l PROMOÇÃO ESPECIAL!\n\n§7Item: §f${itemName}\n§7Quantidade: §a${
          offer.count
        }x\n§7Preço normal: §c${this.core.formatMoney(
          offer.originalPrice
        )}\n§7Preço promocional: §a${this.core.formatMoney(
          offer.discountPrice
        )}\n§7Desconto: §e${discount}%\n\n§7Seu dinheiro: ${this.core.formatMoney(
          balance
        )}\n\n§fAproveitar esta oferta?`
      )
      .button1("§a COMPRAR")
      .button2("§c CANCELAR");

    form.show(player).then((response) => {
      if (response.canceled || response.selection === 1) return;

      if (balance < offer.discountPrice) {
        player.sendMessage(
          `§c Dinheiro insuficiente! Necessário: ${this.core.formatMoney(
            offer.discountPrice
          )}`
        );
        return;
      }

      // Processar compra da oferta
      const inventory = player.getComponent("minecraft:inventory")?.container;
      if (!inventory) {
        player.sendMessage("§c Erro ao acessar inventário!");
        return;
      }

      if (
        !this.core.removeMoney(
          player.name,
          offer.discountPrice,
          `Oferta especial: ${itemName}`
        )
      ) {
        player.sendMessage("§c Erro no pagamento!");
        return;
      }

      const itemStack = new ItemStack(offer.itemId, offer.count);
      inventory.addItem(itemStack);

      player.sendMessage(`§a Oferta aproveitada com sucesso!`);
      player.sendMessage(`§7Item: §f${itemName} §7(${offer.count}x)`);
      player.sendMessage(
        `§7Economia: ${this.core.formatMoney(
          offer.originalPrice - offer.discountPrice
        )}`
      );
      player.sendMessage(
        `§7Valor pago: ${this.core.formatMoney(offer.discountPrice)}`
      );

      // Registrar compra especial
      this.recordPurchase(
        player.name,
        shop.id,
        {
          id: offer.itemId,
          count: offer.count,
          price: offer.discountPrice,
        },
        1,
        offer.discountPrice,
        true
      );
    });
  }

  generateSpecialOffers(shop) {
    const offers = [];
    const currentHour = new Date().getHours();

    // Ofertas baseadas no horário
    shop.categories.forEach((category) => {
      category.items.forEach((item) => {
        // 20% de chance de ter oferta
        if (Math.random() < 0.2) {
          const discountPercent = 0.1 + Math.random() * 0.4; // 10% a 50% de desconto
          const discountPrice = Math.floor(item.price * (1 - discountPercent));

          offers.push({
            itemId: item.id,
            count: item.count,
            originalPrice: item.price,
            discountPrice: discountPrice,
            validUntil: Date.now() + 60 * 60 * 1000, // 1 hora
          });
        }
      });
    });

    return offers.slice(0, 5); // Máximo 5 ofertas
  }

  openNearestShop(player) {
    try {
      // Simplificado - abrir loja geral
      const generalShop = this.shops.get("general_store");
      if (generalShop) {
        // Criar um objeto mock para o NPC
        const mockNPC = {
          getTags: () => ["shopnpc", "shop:general_store"],
        };
        this.openShopInterface(player, mockNPC);
      } else {
        player.sendMessage("§c Nenhuma loja encontrada!");
      }
    } catch (error) {
      player.sendMessage("§c Erro ao abrir loja!");
      world.sendMessage(`§c[Shop] Erro: ${error}`);
    }
  }

  // === UTILITÁRIOS ===

  getShopIdFromNPC(npcEntity) {
    if (!npcEntity) {
      return "general_store"; // Fallback para loja geral
    }

    const tags = npcEntity.getTags();

    // Procurar por tags específicas de loja
    for (const tag of tags) {
      if (tag.startsWith("shop:")) {
        return tag.replace("shop:", "");
      }
    }

    // Usar posição como fallback
    const pos = npcEntity.location;
    return `shop_${Math.floor(pos.x)}_${Math.floor(pos.y)}_${Math.floor(
      pos.z
    )}`;
  }

  getShop(shopId) {
    return this.shops.get(shopId) || this.shops.get("general_store");
  }

  getItemDisplayName(itemId) {
    const name = itemId.replace("minecraft:", "").replace(/_/g, " ");
    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
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

  recordPurchase(
    playerName,
    shopId,
    item,
    quantity,
    totalPrice,
    isSpecialOffer = false
  ) {
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
      date: new Date().toLocaleDateString(),
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
    const currentPoints =
      this.core.getPlayerData(playerName).loyaltyPoints || 0;
    this.core.getPlayerData(playerName).loyaltyPoints = currentPoints + points;
  }

  handleCreateShopCommand(player, message) {
    // Comando para admins criarem lojas
    const parts = message.split(" ");
    if (parts.length < 3) {
      player.sendMessage("§c Use: !shop-create <id> <nome>");
      return;
    }

    const shopId = parts[1];
    const shopName = parts.slice(2).join(" ");

    if (this.shops.has(shopId)) {
      player.sendMessage("§c Loja com este ID já existe!");
      return;
    }

    this.createShop(shopId, {
      name: shopName,
      description: "Loja criada por administrador",
      categories: [
        {
          name: "Itens Gerais",
          textura: "",
          items: [{ id: "minecraft:dirt", count: 64, price: 50, stock: -1 }],
        },
      ],
    });

    player.sendMessage(`§a Loja "${shopName}" criada com ID: ${shopId}`);
    player.sendMessage(
      `§7Use NPCs com tag "shopnpc" e "shop:${shopId}" para acessá-la`
    );
  }

  showShopHelp(player) {
    const help = `§6§l===  AJUDA - SISTEMA DE LOJAS ===

§f§lComandos:
§7• §e/economy shop §7- Abrir loja mais próxima
§7• §e!purchases §7- Ver histórico de compras

§f§lNPCs:
§7• §ashopnpc §7- Acesso às lojas
§7• Tags especiais: §ashop:loja_id

§f§lFuncionalidades:
§7• Múltiplas categorias de itens
§7• Sistema de estoque limitado
§7• Ofertas especiais por tempo limitado
§7• Histórico de compras detalhado
§7• Pontos de fidelidade para compras grandes

§f§lTipos de Loja:
§7• §f Loja Geral §7- Itens básicos
§7• §f Equipamentos §7- Armas e armaduras
§7• §f Materiais Raros §7- Itens especiais

§f§lDicas:
§7• Verifique ofertas especiais regularmente
§7• Compras grandes dão pontos de fidelidade
§7• Alguns itens têm estoque limitado`;

    player.sendMessage(help);
  }

  // === PERSISTÊNCIA ===

  saveShopData() {
    try {
      const saveData = {
        shops: Array.from(this.shops.entries()),
        playerPurchases: Array.from(this.playerPurchases.entries()),
        timestamp: new Date().toISOString(),
      };

      world.setDynamicProperty("shopSystemData", JSON.stringify(saveData));
    } catch (error) {
      world.sendMessage(`§c[Shop System] Erro ao salvar: ${error}`);
    }
  }

  loadShopData() {
    try {
      const savedData = world.getDynamicProperty("shopSystemData");
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

      world.sendMessage(
        `§a[Shop System] Dados carregados: ${this.shops.size} lojas`
      );
    } catch (error) {
      world.sendMessage(`§c[Shop System] Erro ao carregar: ${error}`);
    }
  }
}
