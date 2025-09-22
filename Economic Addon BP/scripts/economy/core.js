import { world, system } from '@minecraft/server';

// Núcleo do Sistema Econômico
export class EconomyCore {
    constructor() {
        this.playerData = new Map();
        this.globalStats = {
            totalMoney: 0,
            totalTransactions: 0,
            dailyTransactions: 0,
            lastResetDate: new Date().toDateString()
        };
        
        this.loadData();
        this.startPeriodicSave();
        this.startDailyReset();
    }

    // === GERENCIAMENTO DE DADOS ===
    
    getPlayerData(playerName) {
        if (!this.playerData.has(playerName)) {
            this.playerData.set(playerName, {
                name: playerName,
                wallet: 1000, // Dinheiro inicial
                bankBalance: 0,
                totalEarned: 1000,
                totalSpent: 0,
                transactions: [],
                joinDate: new Date().toISOString(),
                lastActive: new Date().toISOString()
            });
            this.saveData();
        }
        return this.playerData.get(playerName);
    }

    updatePlayerActivity(playerName) {
        const data = this.getPlayerData(playerName);
        data.lastActive = new Date().toISOString();
    }

    // === SISTEMA DE DINHEIRO ===
    
    getWalletBalance(playerName) {
        return this.getPlayerData(playerName).wallet;
    }

    setWalletBalance(playerName, amount) {
        const data = this.getPlayerData(playerName);
        data.wallet = Math.max(0, Math.floor(amount));
        this.updatePlayerActivity(playerName);
        this.saveData();
    }

    addMoney(playerName, amount, reason = "Não especificado") {
        const data = this.getPlayerData(playerName);
        const oldBalance = data.wallet;
        data.wallet += Math.floor(amount);
        data.totalEarned += Math.floor(amount);
        
        this.addTransaction(playerName, "income", amount, reason, data.wallet);
        this.globalStats.totalMoney += Math.floor(amount);
        this.updatePlayerActivity(playerName);
        this.saveData();
        
        return data.wallet - oldBalance;
    }

    removeMoney(playerName, amount, reason = "Não especificado") {
        const data = this.getPlayerData(playerName);
        const requestedAmount = Math.floor(amount);
        
        if (data.wallet < requestedAmount) {
            return false;
        }
        
        data.wallet -= requestedAmount;
        data.totalSpent += requestedAmount;
        
        this.addTransaction(playerName, "expense", requestedAmount, reason, data.wallet);
        this.globalStats.totalMoney -= requestedAmount;
        this.updatePlayerActivity(playerName);
        this.saveData();
        
        return true;
    }

    transferMoney(fromPlayer, toPlayer, amount, reason = "Transferência") {
        const transferAmount = Math.floor(amount);
        
        if (!this.removeMoney(fromPlayer, transferAmount, `Transferência para ${toPlayer}`)) {
            return false;
        }
        
        this.addMoney(toPlayer, transferAmount, `Transferência de ${fromPlayer}`);
        return true;
    }

    // === SISTEMA BANCÁRIO ===
    
    getBankBalance(playerName) {
        return this.getPlayerData(playerName).bankBalance;
    }

    setBankBalance(playerName, amount) {
        const data = this.getPlayerData(playerName);
        data.bankBalance = Math.max(0, Math.floor(amount));
        this.updatePlayerActivity(playerName);
        this.saveData();
    }

    depositMoney(playerName, amount) {
        const depositAmount = Math.floor(amount);
        
        if (!this.removeMoney(playerName, depositAmount, "Depósito bancário")) {
            return false;
        }
        
        const data = this.getPlayerData(playerName);
        data.bankBalance += depositAmount;
        this.addTransaction(playerName, "bank_deposit", depositAmount, "Depósito no banco", data.bankBalance);
        this.saveData();
        
        return true;
    }

    withdrawMoney(playerName, amount) {
        const withdrawAmount = Math.floor(amount);
        const data = this.getPlayerData(playerName);
        
        if (data.bankBalance < withdrawAmount) {
            return false;
        }
        
        data.bankBalance -= withdrawAmount;
        this.addMoney(playerName, withdrawAmount, "Saque bancário");
        this.addTransaction(playerName, "bank_withdraw", withdrawAmount, "Saque do banco", data.bankBalance);
        this.saveData();
        
        return true;
    }

    bankTransfer(fromPlayer, toPlayer, amount) {
        const transferAmount = Math.floor(amount);
        const fromData = this.getPlayerData(fromPlayer);
        
        if (fromData.bankBalance < transferAmount) {
            return false;
        }
        
        fromData.bankBalance -= transferAmount;
        const toData = this.getPlayerData(toPlayer);
        toData.bankBalance += transferAmount;
        
        this.addTransaction(fromPlayer, "bank_transfer_out", transferAmount, `Transferência bancária para ${toPlayer}`, fromData.bankBalance);
        this.addTransaction(toPlayer, "bank_transfer_in", transferAmount, `Transferência bancária de ${fromPlayer}`, toData.bankBalance);
        
        this.saveData();
        return true;
    }

    // === SISTEMA DE TRANSAÇÕES ===
    
    addTransaction(playerName, type, amount, description, newBalance) {
        const data = this.getPlayerData(playerName);
        
        const transaction = {
            id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: type,
            amount: Math.floor(amount),
            description: description,
            balance: newBalance,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString()
        };
        
        data.transactions.push(transaction);
        
        // Manter apenas as últimas 100 transações
        if (data.transactions.length > 100) {
            data.transactions = data.transactions.slice(-100);
        }
        
        this.globalStats.totalTransactions++;
        this.globalStats.dailyTransactions++;
    }

    getPlayerTransactions(playerName, limit = 10) {
        const data = this.getPlayerData(playerName);
        return data.transactions.slice(-limit).reverse();
    }

    // === FORMATAÇÃO E UTILITÁRIOS ===
    
    formatMoney(amount) {
        const value = Math.floor(amount);
        if (value >= 1000000) {
            return `§6$${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `§6$${(value / 1000).toFixed(1)}K`;
        }
        return `§6$${value.toLocaleString()}`;
    }

    getMoneyIcon(amount) {
        if (amount >= 1000000) return "";
        if (amount >= 100000) return "";
        if (amount >= 10000) return "🏆";
        if (amount >= 1000) return "💵";
        return "🪙";
    }

    // === ESTATÍSTICAS ===
    
    getRegisteredPlayersCount() {
        return this.playerData.size;
    }

    getTotalMoneyInCirculation() {
        let total = 0;
        for (const [, data] of this.playerData) {
            total += data.wallet + data.bankBalance;
        }
        return this.formatMoney(total);
    }

    getTodayTransactions() {
        return this.globalStats.dailyTransactions;
    }

    getPlayerStats(playerName) {
        const data = this.getPlayerData(playerName);
        return {
            totalWealth: data.wallet + data.bankBalance,
            totalEarned: data.totalEarned,
            totalSpent: data.totalSpent,
            transactionCount: data.transactions.length,
            joinDate: data.joinDate,
            lastActive: data.lastActive
        };
    }

    // === SISTEMA DE PERSISTÊNCIA ===
    
    saveData() {
        try {
            const saveData = {
                version: "1.0.0",
                timestamp: new Date().toISOString(),
                playerData: Array.from(this.playerData.entries()),
                globalStats: this.globalStats
            };

            world.setDynamicProperty('economyData', JSON.stringify(saveData));
        } catch (error) {
            world.sendMessage(`§c[Economy Core] Erro ao salvar: ${error}`);
        }
    }

    loadData() {
        try {
            const savedData = world.getDynamicProperty('economyData');
            if (!savedData) {
                world.sendMessage("§e[Economy Core] Criando nova base de dados econômica");
                return;
            }

            const data = JSON.parse(savedData);
            
            if (data.playerData) {
                this.playerData = new Map(data.playerData);
            }
            
            if (data.globalStats) {
                this.globalStats = data.globalStats;
            }

            world.sendMessage(`§a[Economy Core] Dados carregados: ${this.playerData.size} jogadores`);
            
        } catch (error) {
            world.sendMessage(`§c[Economy Core] Erro ao carregar dados: ${error}`);
            this.playerData = new Map();
        }
    }

    startPeriodicSave() {
        system.runInterval(() => {
            this.saveData();
        }, 1200); // Salvar a cada minuto
    }

    startDailyReset() {
        system.runInterval(() => {
            const today = new Date().toDateString();
            if (this.globalStats.lastResetDate !== today) {
                this.globalStats.dailyTransactions = 0;
                this.globalStats.lastResetDate = today;
                world.sendMessage("§e[Economy] Estatísticas diárias resetadas");
            }
        }, 72000); // Verificar a cada hora
    }

    // === VALIDAÇÕES ===
    
    isValidAmount(amount) {
        return !isNaN(amount) && amount > 0 && amount <= 999999999;
    }

    canAfford(playerName, amount) {
        return this.getWalletBalance(playerName) >= Math.floor(amount);
    }

    canAffordBank(playerName, amount) {
        return this.getBankBalance(playerName) >= Math.floor(amount);
    }
}