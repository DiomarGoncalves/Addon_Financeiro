import { world, system } from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';

// Sistema Bancário Completo - Arquivo Separado
export class BankSystem {
    constructor(economyCore) {
        this.core = economyCore;
        this.bankAccounts = new Map();
        this.loanSystem = new Map();
        this.investmentSystem = new Map();
        
        this.setupEvents();
        this.loadBankData();
        world.sendMessage("§a[Bank System] Sistema bancário ativo!");
    }

    setupEvents() {
        // Interação com NPC do banco
        if (world.beforeEvents?.playerInteractWithEntity) {
            world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
                const { player, target: entity } = event;
                
                if (entity.typeId !== "minecraft:npc") return;
                if (!entity.getTags().includes("banknpc")) return;
                
                event.cancel = true;
                system.run(() => this.openBankInterface(player));
            });
        }

        // Comandos bancários
        if (world.beforeEvents?.chatSend) {
            world.beforeEvents.chatSend.subscribe((event) => {
                const message = event.message.toLowerCase();
                const player = event.sender;
                
                if (message === "!extrato" || message === "!statement") {
                    event.cancel = true;
                    this.showBankStatement(player);
                }
            });
        }
    }

    openBankInterface(player) {
        const walletBalance = this.core.getWalletBalance(player.name);
        const bankBalance = this.core.getBankBalance(player.name);
        const account = this.getBankAccount(player.name);
        
        const form = new ActionFormData()
            .title("§8 BANCO CENTRAL")
            .body(`§8Bem-vindo ao Banco Central!\n\n§8 Carteira: ${this.core.formatMoney(walletBalance)}\n§8 Conta Bancária: ${this.core.formatMoney(bankBalance)}\n§8 Tipo de Conta: §f${account.accountType}\n\n§fServiços disponíveis:`)
            .button("§8 DEPOSITAR\n§8Guardar dinheiro na conta")
            .button("§8 SACAR\n§8Retirar dinheiro da conta")
            .button("§8 TRANSFERÊNCIA BANCÁRIA\n§8Enviar para outra conta")
            .button("§8 EXTRATO BANCÁRIO\n§8Ver movimentações da conta")
            .button("§8 EMPRÉSTIMOS\n§8Solicitar crédito")
            .button("§8 INVESTIMENTOS\n§8Aplicar seu dinheiro")
            .button("§8 CONFIGURAÇÕES\n§8Gerenciar sua conta");

        form.show(player).then((response) => {
            if (response.canceled) return;

            switch (response.selection) {
                case 0:
                    this.showDepositForm(player);
                    break;
                case 1:
                    this.showWithdrawForm(player);
                    break;
                case 2:
                    this.showBankTransferForm(player);
                    break;
                case 3:
                    this.showBankStatement(player);
                    break;
                case 4:
                    this.showLoanInterface(player);
                    break;
                case 5:
                    this.showInvestmentInterface(player);
                    break;
                case 6:
                    this.showAccountSettings(player);
                    break;
            }
        });
    }

    showDepositForm(player) {
        const walletBalance = this.core.getWalletBalance(player.name);
        
        if (walletBalance <= 0) {
            player.sendMessage("§c Você não tem dinheiro na carteira para depositar!");
            return;
        }

        const form = new ModalFormData()
            .title("§2§l DEPÓSITO BANCÁRIO")
            .textField(`§8Saldo na carteira: ${this.core.formatMoney(walletBalance)}\n\n§8Digite o valor para depositar:`, walletBalance.toString(), "");

        form.show(player).then((response) => {
            if (response.canceled) return;

            const amount = parseInt(response.formValues[0]);
            
            if (!this.core.isValidAmount(amount)) {
                player.sendMessage("§c Valor inválido!");
                return;
            }

            if (amount > walletBalance) {
                player.sendMessage("§c Saldo insuficiente na carteira!");
                return;
            }

            if (this.core.depositMoney(player.name, amount)) {
                const account = this.getBankAccount(player.name);
                account.totalDeposits += amount;
                account.lastActivity = new Date().toISOString();
                
                player.sendMessage(`§a✅ Depósito realizado com sucesso!`);
                player.sendMessage(`§8Valor depositado: ${this.core.formatMoney(amount)}`);
                player.sendMessage(`§8Novo saldo bancário: ${this.core.formatMoney(this.core.getBankBalance(player.name))}`);
                
                this.saveBankData();
            } else {
                player.sendMessage("§c Erro ao realizar depósito!");
            }
        });
    }

    showWithdrawForm(player) {
        const bankBalance = this.core.getBankBalance(player.name);
        
        if (bankBalance <= 0) {
            player.sendMessage("§c Você não tem dinheiro no banco para sacar!");
            return;
        }

        const form = new ModalFormData()
            .title("§c§l💸 SAQUE BANCÁRIO")
            .textField(`§8Saldo no banco: ${this.core.formatMoney(bankBalance)}\n\n§8Digite o valor para sacar:`, Math.min(bankBalance, 10000).toString(), "");

        form.show(player).then((response) => {
            if (response.canceled) return;

            const amount = parseInt(response.formValues[0]);
            
            if (!this.core.isValidAmount(amount)) {
                player.sendMessage("§c Valor inválido!");
                return;
            }

            if (amount > bankBalance) {
                player.sendMessage("§c Saldo insuficiente no banco!");
                return;
            }

            if (this.core.withdrawMoney(player.name, amount)) {
                const account = this.getBankAccount(player.name);
                account.totalWithdrawals += amount;
                account.lastActivity = new Date().toISOString();
                
                player.sendMessage(`§a✅ Saque realizado com sucesso!`);
                player.sendMessage(`§8Valor sacado: ${this.core.formatMoney(amount)}`);
                player.sendMessage(`§8Novo saldo bancário: ${this.core.formatMoney(this.core.getBankBalance(player.name))}`);
                
                this.saveBankData();
            } else {
                player.sendMessage("§c Erro ao realizar saque!");
            }
        });
    }

    showBankTransferForm(player) {
        const bankBalance = this.core.getBankBalance(player.name);
        
        if (bankBalance <= 0) {
            player.sendMessage("§c Você não tem dinheiro no banco para transferir!");
            return;
        }

        const form = new ModalFormData()
            .title("§8💳 TRANSFERÊNCIA BANCÁRIA")
            .textField("§8Nome do destinatário:", "Steve", "")
            .textField(`§8Seu saldo bancário: ${this.core.formatMoney(bankBalance)}\n\n§8Valor da transferência:`, "1000", "")
            .textField("§8Descrição (opcional):", "Transferência", "");

        form.show(player).then((response) => {
            if (response.canceled) return;

            const targetName = response.formValues[0].trim();
            const amount = parseInt(response.formValues[1]);
            const description = response.formValues[2].trim() || "Transferência bancária";

            if (!targetName || targetName === player.name) {
                player.sendMessage("§c Nome do destinatário inválido!");
                return;
            }

            if (!this.core.isValidAmount(amount)) {
                player.sendMessage("§c Valor inválido!");
                return;
            }

            if (amount > bankBalance) {
                player.sendMessage("§c Saldo insuficiente no banco!");
                return;
            }

            // Taxa de transferência (1% mínimo $5)
            const fee = Math.max(Math.floor(amount * 0.01), 5);
            const totalAmount = amount + fee;

            if (totalAmount > bankBalance) {
                player.sendMessage(`§c Saldo insuficiente! Taxa: ${this.core.formatMoney(fee)}`);
                return;
            }

            if (this.core.bankTransfer(player.name, targetName, totalAmount)) {
                // Registrar a taxa
                this.core.removeMoney(player.name, 0, `Taxa de transferência: ${this.core.formatMoney(fee)}`);
                
                const senderAccount = this.getBankAccount(player.name);
                const receiverAccount = this.getBankAccount(targetName);
                
                senderAccount.totalTransfersSent += amount;
                receiverAccount.totalTransfersReceived += amount;
                
                player.sendMessage(`§a✅ Transferência realizada com sucesso!`);
                player.sendMessage(`§8Para: §f${targetName}`);
                player.sendMessage(`§8Valor: ${this.core.formatMoney(amount)}`);
                player.sendMessage(`§8Taxa: ${this.core.formatMoney(fee)}`);
                player.sendMessage(`§8Total debitado: ${this.core.formatMoney(totalAmount)}`);

                // Notificar destinatário
                const targetPlayer = world.getPlayers().find(p => p.name === targetName);
                if (targetPlayer) {
                    targetPlayer.sendMessage(`§a🏦 Transferência bancária recebida!`);
                    targetPlayer.sendMessage(`§8De: §f${player.name}`);
                    targetPlayer.sendMessage(`§8Valor: ${this.core.formatMoney(amount)}`);
                    targetPlayer.sendMessage(`§8Descrição: §f${description}`);
                }
                
                this.saveBankData();
            } else {
                player.sendMessage("§c Erro ao realizar transferência!");
            }
        });
    }

    showBankStatement(player) {
        const transactions = this.core.getPlayerTransactions(player.name, 15);
        const account = this.getBankAccount(player.name);
        
        if (transactions.length === 0) {
            player.sendMessage("§8Nenhuma movimentação bancária encontrada.");
            return;
        }

        let statement = `§6§l=== 🏦 EXTRATO BANCÁRIO ===\n`;
        statement += `§8Conta: §f${player.name}\n`;
        statement += `§8Tipo: §f${account.accountType}\n`;
        statement += `§8Criada em: §f${new Date(account.createdDate).toLocaleDateString()}\n\n`;
        
        const bankTransactions = transactions.filter(t => 
            t.type.includes('bank') || t.type.includes('transfer')
        );
        
        if (bankTransactions.length === 0) {
            statement += `§8Nenhuma movimentação bancária encontrada.`;
        } else {
            statement += `§8Últimas movimentações:\n`;
            bankTransactions.slice(0, 10).forEach((transaction, index) => {
                const typeIcon = this.getBankTransactionIcon(transaction.type);
                const date = new Date(transaction.timestamp).toLocaleDateString();
                
                statement += `§f${index + 1}. ${typeIcon} ${transaction.description}\n`;
                statement += `§8   ${this.core.formatMoney(transaction.amount)} - ${date}\n`;
            });
        }

        player.sendMessage(statement);
    }

    showLoanInterface(player) {
        const account = this.getBankAccount(player.name);
        const currentLoan = this.loanSystem.get(player.name);
        
        if (currentLoan && currentLoan.remainingAmount > 0) {
            this.showActiveLoanInfo(player, currentLoan);
            return;
        }

        const form = new ActionFormData()
            .title("§8 SISTEMA DE EMPRÉSTIMOS")
            .body(`§8Solicite um empréstimo bancário!\n\n§8Sua conta: §f${account.accountType}\n§8Histórico: §f${account.creditScore}/100\n\n§fOpções disponíveis:`)
            .button("§8 EMPRÉSTIMO PEQUENO\n§8Até $10.000 - Juros 5%")
            .button("§8 EMPRÉSTIMO MÉDIO\n§8Até $50.000 - Juros 8%")
            .button("§8 EMPRÉSTIMO GRANDE\n§8Até $200.000 - Juros 12%")
            .button("§8 SIMULAR EMPRÉSTIMO\n§8Calcular parcelas");

        form.show(player).then((response) => {
            if (response.canceled) return;

            const loanTypes = [
                { max: 10000, interest: 0.05, name: "Pequeno" },
                { max: 50000, interest: 0.08, name: "Médio" },
                { max: 200000, interest: 0.12, name: "Grande" }
            ];

            if (response.selection < 3) {
                const loanType = loanTypes[response.selection];
                this.showLoanApplicationForm(player, loanType);
            } else {
                this.showLoanSimulator(player);
            }
        });
    }

    showLoanApplicationForm(player, loanType) {
        const form = new ModalFormData()
            .title(`§8🎯 EMPRÉSTIMO ${loanType.name.toUpperCase()}`)
            .textField(`§8Valor máximo: ${this.core.formatMoney(loanType.max)}\n§8Juros: ${(loanType.interest * 100).toFixed(1)}%\n\n§8Digite o valor desejado:`, loanType.max.toString(), "")
            .dropdown("§8Parcelas:", ["6 meses", "12 meses", "24 meses", "36 meses"], 1);

        form.show(player).then((response) => {
            if (response.canceled) return;

            const amount = parseInt(response.formValues[0]);
            const installments = [6, 12, 24, 36][response.selection];

            if (!this.core.isValidAmount(amount) || amount > loanType.max) {
                player.sendMessage(`§c Valor inválido! Máximo: ${this.core.formatMoney(loanType.max)}`);
                return;
            }

            this.processLoanApplication(player, amount, loanType.interest, installments);
        });
    }

    processLoanApplication(player, amount, interestRate, installments) {
        const account = this.getBankAccount(player.name);
        
        // Verificar elegibilidade
        if (account.creditScore < 50) {
            player.sendMessage("§c Score de crédito insuficiente! Mínimo: 50 pontos");
            return;
        }

        const totalAmount = amount * (1 + interestRate);
        const monthlyPayment = Math.ceil(totalAmount / installments);

        // Criar empréstimo
        const loan = {
            originalAmount: amount,
            totalAmount: totalAmount,
            remainingAmount: totalAmount,
            monthlyPayment: monthlyPayment,
            installments: installments,
            remainingInstallments: installments,
            interestRate: interestRate,
            startDate: new Date().toISOString(),
            nextPaymentDate: this.calculateNextPaymentDate(),
            status: "active"
        };

        this.loanSystem.set(player.name, loan);
        this.core.addMoney(player.name, amount, `Empréstimo bancário - ${installments} parcelas`);

        account.totalLoans += amount;
        account.creditScore = Math.max(account.creditScore - 10, 0); // Reduz score temporariamente

        player.sendMessage(`§a✅ Empréstimo aprovado!`);
        player.sendMessage(`§8Valor liberado: ${this.core.formatMoney(amount)}`);
        player.sendMessage(`§8Total a pagar: ${this.core.formatMoney(totalAmount)}`);
        player.sendMessage(`§8Parcelas: ${installments}x de ${this.core.formatMoney(monthlyPayment)}`);
        player.sendMessage(`§8Próximo pagamento: ${new Date(loan.nextPaymentDate).toLocaleDateString()}`);

        this.saveBankData();
    }

    showActiveLoanInfo(player, loan) {
        const form = new ActionFormData()
            .title("§8🎯 SEU EMPRÉSTIMO ATIVO")
            .body(`§8Informações do empréstimo:\n\n§8Valor restante: §c${this.core.formatMoney(loan.remainingAmount)}\n§8Parcela mensal: §e${this.core.formatMoney(loan.monthlyPayment)}\n§8Parcelas restantes: §f${loan.remainingInstallments}\n§8Próximo pagamento: §f${new Date(loan.nextPaymentDate).toLocaleDateString()}\n\n§fOpções:`)
            .button("§8 PAGAR PARCELA\n§8Pagar mensalidade")
            .button("§8💵 QUITAR EMPRÉSTIMO\n§8Pagar tudo de uma vez")
            .button("§8 DETALHES COMPLETOS\n§8Ver informações detalhadas");

        form.show(player).then((response) => {
            if (response.canceled) return;

            switch (response.selection) {
                case 0:
                    this.payLoanInstallment(player, loan);
                    break;
                case 1:
                    this.payOffLoan(player, loan);
                    break;
                case 2:
                    this.showLoanDetails(player, loan);
                    break;
            }
        });
    }

    payLoanInstallment(player, loan) {
        const bankBalance = this.core.getBankBalance(player.name);
        
        if (bankBalance < loan.monthlyPayment) {
            player.sendMessage(`§c Saldo bancário insuficiente! Necessário: ${this.core.formatMoney(loan.monthlyPayment)}`);
            return;
        }

        // Debitar do banco
        this.core.setBankBalance(player.name, bankBalance - loan.monthlyPayment);
        
        // Atualizar empréstimo
        loan.remainingAmount -= loan.monthlyPayment;
        loan.remainingInstallments--;
        loan.nextPaymentDate = this.calculateNextPaymentDate();

        if (loan.remainingInstallments <= 0) {
            loan.status = "paid";
            this.loanSystem.delete(player.name);
            
            // Melhorar score de crédito
            const account = this.getBankAccount(player.name);
            account.creditScore = Math.min(account.creditScore + 15, 100);
            
            player.sendMessage(`§a✅ Empréstimo quitado completamente!`);
            player.sendMessage(`§8Seu score de crédito foi melhorado!`);
        } else {
            player.sendMessage(`§a✅ Parcela paga com sucesso!`);
            player.sendMessage(`§8Parcelas restantes: ${loan.remainingInstallments}`);
            player.sendMessage(`§8Próximo pagamento: ${new Date(loan.nextPaymentDate).toLocaleDateString()}`);
        }

        this.core.addTransaction(player.name, "loan_payment", loan.monthlyPayment, "Pagamento de empréstimo", bankBalance - loan.monthlyPayment);
        this.saveBankData();
    }

    payOffLoan(player, loan) {
        const bankBalance = this.core.getBankBalance(player.name);
        
        if (bankBalance < loan.remainingAmount) {
            player.sendMessage(`§c Saldo bancário insuficiente! Necessário: ${this.core.formatMoney(loan.remainingAmount)}`);
            return;
        }

        const form = new MessageFormData()
            .title("§8💵 QUITAR EMPRÉSTIMO")
            .body(`§8Confirmar quitação?\n\n§8Valor total: §c${this.core.formatMoney(loan.remainingAmount)}\n§8Seu saldo: §a${this.core.formatMoney(bankBalance)}\n\n§aVocê receberá um bônus no score de crédito!`)
            .button1("§a✅ QUITAR")
            .button2("§c CANCELAR");

        form.show(player).then((response) => {
            if (response.canceled || response.selection === 1) return;

            // Debitar do banco
            this.core.setBankBalance(player.name, bankBalance - loan.remainingAmount);
            
            // Finalizar empréstimo
            loan.status = "paid_off";
            this.loanSystem.delete(player.name);
            
            // Melhorar score significativamente
            const account = this.getBankAccount(player.name);
            account.creditScore = Math.min(account.creditScore + 25, 100);
            
            player.sendMessage(`§a✅ Empréstimo quitado antecipadamente!`);
            player.sendMessage(`§8Valor pago: ${this.core.formatMoney(loan.remainingAmount)}`);
            player.sendMessage(`§8Bônus no score de crédito aplicado!`);
            
            this.core.addTransaction(player.name, "loan_payoff", loan.remainingAmount, "Quitação antecipada de empréstimo", bankBalance - loan.remainingAmount);
            this.saveBankData();
        });
    }

    showInvestmentInterface(player) {
        const bankBalance = this.core.getBankBalance(player.name);
        const currentInvestment = this.investmentSystem.get(player.name);
        
        const form = new ActionFormData()
            .title("§8 CENTRO DE INVESTIMENTOS")
            .body(`§8Faça seu dinheiro render!\n\n§8Saldo bancário: ${this.core.formatMoney(bankBalance)}\n${currentInvestment ? `§8Investimento ativo: ${this.core.formatMoney(currentInvestment.amount)}` : '§8Nenhum investimento ativo'}\n\n§fOpções de investimento:`)
            .button("§2§l🟢 POUPANÇA SEGURA\n§8Rendimento: 2% ao mês")
            .button("§8🟡 INVESTIMENTO MODERADO\n§8Rendimento: 5% ao mês")
            .button("§c§l🔴 INVESTIMENTO ARRISCADO\n§8Rendimento: 10% ao mês")
            .button("§8 RESGATAR INVESTIMENTO\n§8Sacar valor investido");

        form.show(player).then((response) => {
            if (response.canceled) return;

            const investmentTypes = [
                { name: "Poupança Segura", rate: 0.02, risk: 0, minAmount: 1000 },
                { name: "Investimento Moderado", rate: 0.05, risk: 0.1, minAmount: 5000 },
                { name: "Investimento Arriscado", rate: 0.10, risk: 0.3, minAmount: 10000 }
            ];

            if (response.selection < 3) {
                const investmentType = investmentTypes[response.selection];
                this.showInvestmentForm(player, investmentType);
            } else {
                this.showWithdrawInvestmentForm(player);
            }
        });
    }

    showInvestmentForm(player, investmentType) {
        const bankBalance = this.core.getBankBalance(player.name);
        
        if (bankBalance < investmentType.minAmount) {
            player.sendMessage(`§c Valor mínimo para este investimento: ${this.core.formatMoney(investmentType.minAmount)}`);
            return;
        }

        const form = new ModalFormData()
            .title(`§8 ${investmentType.name.toUpperCase()}`)
            .textField(`§8Rendimento: ${(investmentType.rate * 100).toFixed(1)}% ao mês\n§8Risco: ${investmentType.risk > 0 ? 'Alto' : 'Baixo'}\n§8Mínimo: ${this.core.formatMoney(investmentType.minAmount)}\n\n§8Digite o valor para investir:`, investmentType.minAmount.toString(), "");

        form.show(player).then((response) => {
            if (response.canceled) return;

            const amount = parseInt(response.formValues[0]);

            if (!this.core.isValidAmount(amount) || amount < investmentType.minAmount) {
                player.sendMessage(`§c Valor inválido! Mínimo: ${this.core.formatMoney(investmentType.minAmount)}`);
                return;
            }

            if (amount > bankBalance) {
                player.sendMessage("§c Saldo bancário insuficiente!");
                return;
            }

            this.createInvestment(player, amount, investmentType);
        });
    }

    createInvestment(player, amount, investmentType) {
        // Verificar se já tem investimento ativo
        if (this.investmentSystem.has(player.name)) {
            player.sendMessage("§c Você já possui um investimento ativo! Resgate primeiro.");
            return;
        }

        // Debitar do banco
        const bankBalance = this.core.getBankBalance(player.name);
        this.core.setBankBalance(player.name, bankBalance - amount);

        // Criar investimento
        const investment = {
            amount: amount,
            originalAmount: amount,
            type: investmentType.name,
            rate: investmentType.rate,
            risk: investmentType.risk,
            startDate: new Date().toISOString(),
            lastUpdate: new Date().toISOString(),
            monthsActive: 0
        };

        this.investmentSystem.set(player.name, investment);

        player.sendMessage(`§a✅ Investimento realizado com sucesso!`);
        player.sendMessage(`§8Tipo: §f${investmentType.name}`);
        player.sendMessage(`§8Valor: ${this.core.formatMoney(amount)}`);
        player.sendMessage(`§8Rendimento: §a${(investmentType.rate * 100).toFixed(1)}% ao mês`);
        player.sendMessage(`§8O rendimento será aplicado automaticamente!`);

        this.core.addTransaction(player.name, "investment", amount, `Investimento: ${investmentType.name}`, bankBalance - amount);
        this.saveBankData();
    }

    showWithdrawInvestmentForm(player) {
        const investment = this.investmentSystem.get(player.name);
        
        if (!investment) {
            player.sendMessage("§c Você não possui investimentos ativos!");
            return;
        }

        const monthsActive = Math.floor((Date.now() - new Date(investment.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
        const currentValue = this.calculateInvestmentValue(investment);

        const form = new MessageFormData()
            .title("§8 RESGATAR INVESTIMENTO")
            .body(`§8Seu investimento:\n\n§8Tipo: §f${investment.type}\n§8Valor inicial: ${this.core.formatMoney(investment.originalAmount)}\n§8Valor atual: §a${this.core.formatMoney(currentValue)}\n§8Rendimento: §a${this.core.formatMoney(currentValue - investment.originalAmount)}\n§8Tempo ativo: §f${monthsActive} meses\n\n§fResgatar investimento?`)
            .button1("§a✅ RESGATAR")
            .button2("§c MANTER INVESTINDO");

        form.show(player).then((response) => {
            if (response.canceled || response.selection === 1) return;

            this.withdrawInvestment(player, investment, currentValue);
        });
    }

    withdrawInvestment(player, investment, currentValue) {
        // Adicionar ao banco
        const bankBalance = this.core.getBankBalance(player.name);
        this.core.setBankBalance(player.name, bankBalance + currentValue);

        // Remover investimento
        this.investmentSystem.delete(player.name);

        const profit = currentValue - investment.originalAmount;

        player.sendMessage(`§a✅ Investimento resgatado com sucesso!`);
        player.sendMessage(`§8Valor resgatado: ${this.core.formatMoney(currentValue)}`);
        player.sendMessage(`§8Lucro obtido: §a${this.core.formatMoney(profit)}`);
        player.sendMessage(`§8Novo saldo bancário: ${this.core.formatMoney(bankBalance + currentValue)}`);

        this.core.addTransaction(player.name, "investment_withdraw", currentValue, `Resgate de investimento: ${investment.type}`, bankBalance + currentValue);
        this.saveBankData();
    }

    calculateInvestmentValue(investment) {
        const monthsActive = Math.floor((Date.now() - new Date(investment.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
        let value = investment.originalAmount;

        for (let i = 0; i < monthsActive; i++) {
            // Aplicar rendimento com possível risco
            let monthlyReturn = investment.rate;
            
            if (investment.risk > 0) {
                // Chance de perda baseada no risco
                const randomFactor = Math.random();
                if (randomFactor < investment.risk) {
                    monthlyReturn = -investment.rate * 0.5; // Perda de metade do rendimento
                }
            }
            
            value *= (1 + monthlyReturn);
        }

        return Math.floor(value);
    }

    showAccountSettings(player) {
        const account = this.getBankAccount(player.name);
        
        const form = new ActionFormData()
            .title("§8⚙️ CONFIGURAÇÕES DA CONTA")
            .body(`§8Informações da conta:\n\n§8Nome: §f${player.name}\n§8Tipo: §f${account.accountType}\n§8Score: §f${account.creditScore}/100\n§8Criada em: §f${new Date(account.createdDate).toLocaleDateString()}\n\n§fOpções:`)
            .button("§8⬆️ UPGRADE DE CONTA\n§8Melhorar tipo de conta")
            .button("§8 RELATÓRIO COMPLETO\n§8Ver estatísticas detalhadas")
            .button("§8🎯 MELHORAR SCORE\n§8Dicas para aumentar crédito");

        form.show(player).then((response) => {
            if (response.canceled) return;

            switch (response.selection) {
                case 0:
                    this.showAccountUpgrade(player);
                    break;
                case 1:
                    this.showAccountReport(player);
                    break;
                case 2:
                    this.showCreditTips(player);
                    break;
            }
        });
    }

    showAccountUpgrade(player) {
        const account = this.getBankAccount(player.name);
        const bankBalance = this.core.getBankBalance(player.name);
        
        const upgrades = {
            "Básica": { next: "Premium", cost: 10000, benefits: "Juros reduzidos, limite maior" },
            "Premium": { next: "VIP", cost: 50000, benefits: "Investimentos exclusivos, sem taxas" },
            "VIP": { next: "Black", cost: 200000, benefits: "Gerente pessoal, produtos exclusivos" }
        };

        const upgrade = upgrades[account.accountType];
        
        if (!upgrade) {
            player.sendMessage("§a✅ Você já possui a conta mais premium disponível!");
            return;
        }

        const form = new MessageFormData()
            .title("§8⬆️ UPGRADE DE CONTA")
            .body(`§8Upgrade disponível:\n\n§8De: §f${account.accountType}\n§8Para: §a${upgrade.next}\n§8Custo: §c${this.core.formatMoney(upgrade.cost)}\n§8Benefícios: §f${upgrade.benefits}\n\n§8Seu saldo: ${this.core.formatMoney(bankBalance)}\n\n§fRealizar upgrade?`)
            .button1("§a✅ FAZER UPGRADE")
            .button2("§c CANCELAR");

        form.show(player).then((response) => {
            if (response.canceled || response.selection === 1) return;

            if (bankBalance < upgrade.cost) {
                player.sendMessage(`§c Saldo insuficiente! Necessário: ${this.core.formatMoney(upgrade.cost)}`);
                return;
            }

            // Debitar custo
            this.core.setBankBalance(player.name, bankBalance - upgrade.cost);
            
            // Fazer upgrade
            account.accountType = upgrade.next;
            account.creditScore = Math.min(account.creditScore + 10, 100);

            player.sendMessage(`§a✅ Upgrade realizado com sucesso!`);
            player.sendMessage(`§8Nova conta: §a${upgrade.next}`);
            player.sendMessage(`§8Score melhorado em 10 pontos!`);

            this.core.addTransaction(player.name, "account_upgrade", upgrade.cost, `Upgrade para conta ${upgrade.next}`, bankBalance - upgrade.cost);
            this.saveBankData();
        });
    }

    showAccountReport(player) {
        const account = this.getBankAccount(player.name);
        const stats = this.core.getPlayerStats(player.name);
        
        const report = `§6§l===  RELATÓRIO DA CONTA ===

§8Informações Gerais:
§8• Nome: §f${player.name}
§8• Tipo de Conta: §f${account.accountType}
§8• Score de Crédito: §f${account.creditScore}/100
§8• Membro desde: §f${new Date(account.createdDate).toLocaleDateString()}

§8Movimentação Financeira:
§8• Total depositado: ${this.core.formatMoney(account.totalDeposits)}
§8• Total sacado: ${this.core.formatMoney(account.totalWithdrawals)}
§8• Transferências enviadas: ${this.core.formatMoney(account.totalTransfersSent)}
§8• Transferências recebidas: ${this.core.formatMoney(account.totalTransfersReceived)}

§8Patrimônio Atual:
§8• Carteira: ${this.core.formatMoney(this.core.getWalletBalance(player.name))}
§8• Banco: ${this.core.formatMoney(this.core.getBankBalance(player.name))}
§8• Total: ${this.core.formatMoney(stats.totalWealth)}

§8Histórico de Crédito:
§8• Empréstimos totais: ${this.core.formatMoney(account.totalLoans)}
§8• Status atual: ${this.loanSystem.has(player.name) ? '§cEmpréstimo ativo' : '§aLivre de dívidas'}`;

        player.sendMessage(report);
    }

    showCreditTips(player) {
        const tips = `§6§l=== 🎯 DICAS PARA MELHORAR SEU SCORE ===

§8✅ Ações que AUMENTAM o score:
§a• Pagar empréstimos em dia (+5 pontos)
§a• Quitar empréstimos antecipadamente (+25 pontos)
§a• Fazer upgrade de conta (+10 pontos)
§a• Manter saldo alto no banco (+1 ponto/mês)
§a• Usar serviços bancários regularmente (+2 pontos/mês)

§8 Ações que DIMINUEM o score:
§c• Pegar empréstimos (-10 pontos temporário)
§c• Atrasar pagamentos (-20 pontos)
§c• Ter conta com saldo baixo (-1 ponto/mês)

§8💡 Dicas especiais:
§e• Score máximo: 100 pontos
§e• Score mínimo para empréstimos: 50 pontos
§e• Score é atualizado automaticamente
§e• Contas premium têm bônus no score`;

        player.sendMessage(tips);
    }

    // === UTILITÁRIOS ===

    getBankAccount(playerName) {
        if (!this.bankAccounts.has(playerName)) {
            this.bankAccounts.set(playerName, {
                playerName: playerName,
                accountType: "Básica",
                creditScore: 75,
                createdDate: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                totalDeposits: 0,
                totalWithdrawals: 0,
                totalTransfersSent: 0,
                totalTransfersReceived: 0,
                totalLoans: 0
            });
        }
        return this.bankAccounts.get(playerName);
    }

    getBankTransactionIcon(type) {
        const icons = {
            bank_deposit: "§a🏦⬆",
            bank_withdraw: "§c🏦⬇",
            bank_transfer_in: "§b🏦➡",
            bank_transfer_out: "§e🏦⬅",
            loan_payment: "§d💳",
            loan_payoff: "§a💳✅",
            investment: "§a⬆",
            investment_withdraw: "§e⬇",
            account_upgrade: "§f⬆️"
        };
        return icons[type] || "§8🏦";
    }

    calculateNextPaymentDate() {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth.toISOString();
    }

    showBankHelp(player) {
        const help = `§6§l=== 🏦 AJUDA - SISTEMA BANCÁRIO ===

§8Serviços Básicos:
§8• §e/economy bank §8- Abrir interface do banco
§8• §e!extrato §8- Ver movimentações

§8NPCs:
§8• §abanknpc §8- Acesso completo ao banco

§8Funcionalidades:
§8• Depósitos e saques
§8• Transferências bancárias (taxa 1%)
§8• Empréstimos com juros
§8• Investimentos com rendimento
§8• Sistema de score de crédito
§8• Upgrade de contas

§8Tipos de Conta:
§8• §fBásica §8- Conta inicial
§8• §aPremium §8- Benefícios extras
§8• §bVIP §8- Serviços exclusivos
§8• §0Black §8- Conta premium máxima`;

        player.sendMessage(help);
    }

    // === PERSISTÊNCIA ===

    saveBankData() {
        try {
            const saveData = {
                bankAccounts: Array.from(this.bankAccounts.entries()),
                loanSystem: Array.from(this.loanSystem.entries()),
                investmentSystem: Array.from(this.investmentSystem.entries()),
                timestamp: new Date().toISOString()
            };

            world.setDynamicProperty('bankSystemData', JSON.stringify(saveData));
        } catch (error) {
            world.sendMessage(`§c[Bank System] Erro ao salvar: ${error}`);
        }
    }

    loadBankData() {
        try {
            const savedData = world.getDynamicProperty('bankSystemData');
            if (!savedData) return;

            const data = JSON.parse(savedData);
            
            if (data.bankAccounts) {
                this.bankAccounts = new Map(data.bankAccounts);
            }
            
            if (data.loanSystem) {
                this.loanSystem = new Map(data.loanSystem);
            }
            
            if (data.investmentSystem) {
                this.investmentSystem = new Map(data.investmentSystem);
            }

            world.sendMessage(`§a[Bank System] Dados carregados: ${this.bankAccounts.size} contas`);
        } catch (error) {
            world.sendMessage(`§c[Bank System] Erro ao carregar: ${error}`);
        }
    }
}