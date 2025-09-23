import { world, system } from '@minecraft/server';
import { EconomyCore } from './economy/core.js';
import { BankSystem } from './bank/bank.js';
import { ShopSystem } from './shop/shop.js';
import { ExchangeSystem } from './exchange/exchange.js';
import { MoneySystem } from './money/money.js';
import { PhoneSystem } from './phone/phoneSystem.js';
import { AdminSystem } from './admin/adminSystem.js';

// Sistema Principal de Economia
class EconomicAddon {
    constructor() {
        this.economyCore = null;
        this.bankSystem = null;
        this.shopSystem = null;
        this.exchangeSystem = null;
        this.moneySystem = null;
        this.phoneSystem = null;
        this.adminSystem = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            world.sendMessage("[Economic Addon] Iniciando sistema economico completo...");
            
            // Inicializar sistemas em ordem
            this.economyCore = new EconomyCore();
            this.moneySystem = new MoneySystem(this.economyCore);
            this.bankSystem = new BankSystem(this.economyCore);
            this.shopSystem = new ShopSystem(this.economyCore);
            this.exchangeSystem = new ExchangeSystem(this.economyCore);
            this.phoneSystem = new PhoneSystem(this.economyCore, this.bankSystem, this.shopSystem, this.exchangeSystem, this.moneySystem);
            this.adminSystem = new AdminSystem(this.economyCore, this.bankSystem, this.shopSystem, this.exchangeSystem, this.moneySystem);
            
            this.initialized = true;
            world.sendMessage("[Economic Addon] Sistema economico ativo!");
            world.sendMessage("Use o celular para acessar todos os servicos!");
            
        } catch (error) {
            world.sendMessage(`[Economic Addon] Erro na inicializacao: ${error}`);
        }
    }
}

// Instância global do addon
let economicAddon = null;

// Inicializar addon
system.runTimeout(() => {
    world.sendMessage("[Economic Addon] Carregando...");
    economicAddon = new EconomicAddon();
    economicAddon.initialize();
}, 20);

// Exportar para debug global
globalThis.economicAddon = economicAddon;