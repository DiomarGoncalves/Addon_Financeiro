import { world, system } from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';

// Sistema de Celular - Interface Principal
export class PhoneSystem {
    constructor(economyCore, bankSystem, shopSystem, exchangeSystem, moneySystem) {
        this.core = economyCore;
        this.bankSystem = bankSystem;
        this.shopSystem = shopSystem;
        this.exchangeSystem = exchangeSystem;
        this.moneySystem = moneySystem;
        
        this.setupEvents();
        world.sendMessage("[Phone System] Sistema de celular ativo!");
    }

    setupEvents() {
        // Uso do celular
        if (world.afterEvents?.itemUse) {
            world.afterEvents.itemUse.subscribe((event) => {
                const { source: player, itemStack } = event;
                
                if (itemStack?.typeId === 'economic:phone') {
                    system.run(() => this.openPhoneInterface(player));
                }
            });
        }
    }

    openPhoneInterface(player) {
        const balance = this.core.getWalletBalance(player.name);
        const bankBalance = this.core.getBankBalance(player.name);
        const totalWealth = balance + bankBalance;
        
        const form = new ActionFormData()
            .title("CELULAR ECONOMICO")
            .body(`Bem-vindo ao seu celular economico!\n\nCarteira: ${this.core.formatMoney(balance)}\nBanco: ${this.core.formatMoney(bankBalance)}\nTotal: ${this.core.formatMoney(totalWealth)}\n\nEscolha um aplicativo:`)
            .button("CARTEIRA\nGerenciar seu dinheiro")
            .button("BANCO\nServicos bancarios")
            .button("LOJA\nComprar itens")
            .button("CAMBIO\nTrocar itens por dinheiro")
            .button("TRANSFERENCIA\nEnviar dinheiro")
            .button("EXTRATO\nVer transacoes")
            .button("CONFIGURACOES\nOpcoes do sistema");

        form.show(player).then((response) => {
            if (response.canceled) return;

            switch (response.selection) {
                case 0:
                    this.openWalletApp(player);
                    break;
                case 1:
                    this.bankSystem.openBankInterface(player);
                    break;
                case 2:
                    this.shopSystem.openNearestShop(player);
                    break;
                case 3:
                    this.exchangeSystem.openExchangeInterface(player);
                    break;
                case 4:
                    this.openTransferApp(player);
                    break;
                case 5:
                    this.openStatementApp(player);
                    break;
                case 6:
                    this.openSettingsApp(player);
                    break;
            }
        });
    }

    openWalletApp(player) {
        const balance = this.core.getWalletBalance(player.name);
        const bankBalance = this.core.getBankBalance(player.name);
        const stats = this.core.getPlayerStats(player.name);
        
        const form = new ActionFormData()
            .title("CARTEIRA DIGITAL")
            .body(`Informacoes da sua carteira:\n\nSaldo atual: ${this.core.formatMoney(balance)}\nBanco: ${this.core.formatMoney(bankBalance)}\nTotal ganho: ${this.core.formatMoney(stats.totalEarned)}\nTotal gasto: ${this.core.formatMoney(stats.totalSpent)}\n\nOpcoes:`)
            .button("CONVERTER PARA FISICO\nTransformar em itens")
            .button("CONVERTER DE FISICO\nItens para digital")
            .button("VOLTAR\nMenu principal");

        form.show(player).then((response) => {
            if (response.canceled) return;

            switch (response.selection) {
                case 0:
                    this.moneySystem.showConvertToPhysicalForm(player);
                    break;
                case 1:
                    this.moneySystem.showConvertToDigitalForm(player);
                    break;
                case 2:
                    this.openPhoneInterface(player);
                    break;
            }
        });
    }

    openTransferApp(player) {
        const balance = this.core.getWalletBalance(player.name);
        
        const form = new ModalFormData()
            .title("TRANSFERENCIA")
            .textField(`Seu saldo: ${this.core.formatMoney(balance)}\n\nNome do destinatario:`, "Steve", "")
            .textField("Valor da transferencia:", "100", "")
            .textField("Mensagem (opcional):", "Transferencia", "");

        form.show(player).then((response) => {
            if (response.canceled) return;

            const targetName = response.formValues[0].trim();
            const amount = parseInt(response.formValues[1]);
            const message = response.formValues[2].trim() || "Transferencia";

            if (!targetName || targetName === player.name) {
                player.sendMessage("Nome do destinatario invalido!");
                return;
            }

            if (!this.core.isValidAmount(amount)) {
                player.sendMessage("Valor invalido!");
                return;
            }

            if (!this.core.transferMoney(player.name, targetName, amount, message)) {
                player.sendMessage("Dinheiro insuficiente!");
                return;
            }

            player.sendMessage(`Transferencia realizada com sucesso!`);
            player.sendMessage(`Para: ${targetName}`);
            player.sendMessage(`Valor: ${this.core.formatMoney(amount)}`);

            const targetPlayer = world.getPlayers().find(p => p.name === targetName);
            if (targetPlayer) {
                targetPlayer.sendMessage(`Transferencia recebida de ${player.name}: ${this.core.formatMoney(amount)}`);
                targetPlayer.sendMessage(`Mensagem: ${message}`);
            }
        });
    }

    openStatementApp(player) {
        const transactions = this.core.getPlayerTransactions(player.name, 15);
        
        if (transactions.length === 0) {
            player.sendMessage("Nenhuma transacao encontrada.");
            return;
        }

        let statement = `=== EXTRATO BANCARIO ===\n\n`;
        
        transactions.forEach((transaction, index) => {
            const date = new Date(transaction.timestamp).toLocaleDateString();
            const typeIcon = this.getTransactionIcon(transaction.type);
            
            statement += `${index + 1}. ${typeIcon} ${transaction.description}\n`;
            statement += `   ${this.core.formatMoney(transaction.amount)} - ${date}\n`;
        });

        player.sendMessage(statement);
    }

    getTransactionIcon(type) {
        const icons = {
            income: "RECEBIDO",
            expense: "GASTO",
            bank_deposit: "DEPOSITO",
            bank_withdraw: "SAQUE",
            bank_transfer_in: "TRANSFERENCIA RECEBIDA",
            bank_transfer_out: "TRANSFERENCIA ENVIADA"
        };
        return icons[type] || "TRANSACAO";
    }

    openSettingsApp(player) {
        const form = new ActionFormData()
            .title("CONFIGURACOES")
            .body("Configuracoes do sistema economico:")
            .button("AJUDA\nComo usar o sistema")
            .button("STATUS\nInformacoes do sistema")
            .button("VOLTAR\nMenu principal");

        form.show(player).then((response) => {
            if (response.canceled) return;

            switch (response.selection) {
                case 0:
                    this.showHelp(player);
                    break;
                case 1:
                    this.showSystemStatus(player);
                    break;
                case 2:
                    this.openPhoneInterface(player);
                    break;
            }
        });
    }

    showHelp(player) {
        const help = `=== AJUDA - SISTEMA ECONOMICO ===

CELULAR:
• Use o celular para acessar todos os servicos
• Acesse carteira, banco, loja e cambio
• Faca transferencias e veja extratos

CARTEIRA:
• Converta dinheiro digital em fisico
• Converta dinheiro fisico em digital
• Gerencie seu saldo

BANCO:
• Deposite e saque dinheiro
• Faca transferencias bancarias
• Solicite emprestimos e investimentos

LOJA:
• Compre itens com seu dinheiro
• Varias categorias disponiveis
• Ofertas especiais

CAMBIO:
• Venda itens por dinheiro
• Precos variam com demanda
• Limites diarios por item`;

        player.sendMessage(help);
    }

    showSystemStatus(player) {
        const status = `=== STATUS DO SISTEMA ===

Sistemas Ativos:
- Core Economico: ATIVO
- Sistema de Dinheiro: ATIVO
- Sistema Bancario: ATIVO
- Sistema de Lojas: ATIVO
- Casa de Cambio: ATIVO
- Sistema de Celular: ATIVO

Estatisticas:
• Jogadores registrados: ${this.core.getRegisteredPlayersCount()}
• Total em circulacao: ${this.core.getTotalMoneyInCirculation()}
• Transacoes hoje: ${this.core.getTodayTransactions()}

Versao: v1.0.0`;

        player.sendMessage(status);
    }
}