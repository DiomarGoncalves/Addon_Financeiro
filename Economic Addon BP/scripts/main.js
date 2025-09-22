import { world, system } from '@minecraft/server';
import { EconomyCore } from './economy/core.js';
import { BankSystem } from './bank/bank.js';
import { ShopSystem } from './shop/shop.js';
import { ExchangeSystem } from './exchange/exchange.js';
import { MoneySystem } from './money/money.js';

// Sistema Principal de Economia
class EconomicAddon {
    constructor() {
        this.economyCore = null;
        this.bankSystem = null;
        this.shopSystem = null;
        this.exchangeSystem = null;
        this.moneySystem = null;
        this.initialized = false;
    }

    async initialize() {
        try {

            this.economyCore = new EconomyCore();
            this.moneySystem = new MoneySystem(this.economyCore);
            this.bankSystem = new BankSystem(this.economyCore);
            this.shopSystem = new ShopSystem(this.economyCore);
            this.exchangeSystem = new ExchangeSystem(this.economyCore);
            this.initialized = true;
            world.sendMessage("§a[Economic Addon] Sistema econômico ativo!");
           
        } catch (error) {
            world.sendMessage(`§c[Economic Addon] Erro na inicialização: ${error}`);
        }
    }
}

// Instância global do addon
let economicAddon = null;

// Inicializar addon
system.runTimeout(() => {
    world.sendMessage("§e[Economic Addon] Carregando...");
    economicAddon = new EconomicAddon();
    economicAddon.initialize();
}, 20);

// Exportar para debug global
globalThis.economicAddon = economicAddon;

/*
Como usar o addon:
- Coloque NPCs com as tags:
    • banknpc      → abre o banco
    • shopnpc      → abre a loja
    • exchangenpc  → abre a casa de câmbio
    • moneynpc     → abre o gerenciador de dinheiro físico/digital
- Interaja com o NPC para abrir o menu correspondente.
- Todo o sistema funciona apenas por menus e NPCs, sem comandos no chat.
*/