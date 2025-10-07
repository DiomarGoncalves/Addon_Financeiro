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

    // Método para resetar todos os dados internos
    clearData() {
        this.bankAccounts.clear();
        this.loanSystem.clear();
        this.investmentSystem.clear();
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
            .title("§7banco central")
            .body(`§f§lBem-vindo ao Banco Central!\n\n§7💵 Carteira: ${this.core.formatMoney(walletBalance)}\n§7🏦 Conta Bancária: ${this.core.formatMoney(bankBalance)}\n§7📊 Tipo de Conta: §f${account.accountType}\n\n§fServiços disponíveis:`)
            .button("§7depositar\nguardar dinheiro na conta")
            .button("§7sacar\nretirar dinheiro da conta")
            .button("§7transferência bancária\nenviar para outra conta")
            .button("§7extrato bancário\nver movimentações da conta")
            .button("§7empréstimos\nsolicitar crédito")
            .button("§7investimentos\naplicar seu dinheiro")
            .button("§7️ configurações\ngerenciar sua conta");

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
            .title("§7depósito bancário")
            .textField(`§f§lSaldo na carteira: ${this.core.formatMoney(walletBalance)}\n\n§7Digite o valor para depositar:`, walletBalance.toString(), "");

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
                
                player.sendMessage(`§a Depósito realizado com sucesso!`);
                player.sendMessage(`§7Valor depositado: ${this.core.formatMoney(amount)}`);
                player.sendMessage(`§7Novo saldo bancário: ${this.core.formatMoney(this.core.getBankBalance(player.name))}`);
                
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
            .title("§7saque bancário")
            .textField(`§f§lSaldo no banco: ${this.core.formatMoney(bankBalance)}\n\n§7Digite o valor para sacar:`, Math.min(bankBalance, 10000).toString(), "");

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
                
                player.sendMessage(`§a Saque realizado com sucesso!`);
                player.sendMessage(`§7Valor sacado: ${this.core.formatMoney(amount)}`);
                player.sendMessage(`§7Novo saldo bancário: ${this.core.formatMoney(this.core.getBankBalance(player.name))}`);
                
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
            .title("§7transferência bancária")
            .textField("§7nome do destinatário:", "§7steve", "")
            .textField(`§f§lSeu saldo bancário: ${this.core.formatMoney(bankBalance)}\n\n§7Valor da transferência:`, "1000", "")
            .textField("§7descrição (opcional):", "§7transferência", "");

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
                
                player.sendMessage(`§a Transferência realizada com sucesso!`);
                player.sendMessage(`§7Para: §f${targetName}`);
                player.sendMessage(`§7Valor: ${this.core.formatMoney(amount)}`);
                player.sendMessage(`§7Taxa: ${this.core.formatMoney(fee)}`);
                player.sendMessage(`§7Total debitado: ${this.core.formatMoney(totalAmount)}`);

                // Notificar destinatário
                const targetPlayer = world.getPlayers().find(p => p.name === targetName);
                if (targetPlayer) {
                    targetPlayer.sendMessage(`§a🏦 Transferência bancária recebida!`);
                    targetPlayer.sendMessage(`§7De: §f${player.name}`);
                    targetPlayer.sendMessage(`§7Valor: ${this.core.formatMoney(amount)}`);
                    targetPlayer.sendMessage(`§7Descrição: §f${description}`);
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
            player.sendMessage("§7Nenhuma movimentação bancária encontrada.");
            return;
        }

        let statement = `§6§l=== 🏦 EXTRATO BANCÁRIO ===\n`;
        statement += `§7Conta: §f${player.name}\n`;
        statement += `§7Tipo: §f${account.accountType}\n`;
        statement += `§7Criada em: §f${new Date(account.createdDate).toLocaleDateString()}\n\n`;
        
        const bankTransactions = transactions.filter(t => 
            t.type.includes('bank') || t.type.includes('transfer')
        );
        
        if (bankTransactions.length === 0) {
            statement += `§7Nenhuma movimentação bancária encontrada.`;
        } else {
            statement += `§f§lÚltimas movimentações:\n`;
            bankTransactions.slice(0, 10).forEach((transaction, index) => {
                const typeIcon = this.getBankTransactionIcon(transaction.type);
                const date = new Date(transaction.timestamp).toLocaleDateString();
                
                statement += `§f${index + 1}. ${typeIcon} ${transaction.description}\n`;
                statement += `§7   ${this.core.formatMoney(transaction.amount)} - ${date}\n`;
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
            .title("§7sistema de empréstimos")
            .body(`§f§lSolicite um empréstimo bancário!\n\n§7Sua conta: §f${account.accountType}\n§7Histórico: §f${account.creditScore}/100\n\n§fOpções disponíveis:`)
            .button("§7empréstimo pequeno\naté $10.000 - juros 5%")
            .button("§7empréstimo médio\naté $50.000 - juros 8%")
            .button("§7empréstimo grande\naté $200.000 - juros 12%")
            .button("§7simular empréstimo\ncalcular parcelas");

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
            .title(`§7 EMPRÉSTIMO ${loanType.name.toUpperCase()}`)
            .textField(`§f§lValor máximo: ${this.core.formatMoney(loanType.max)}\n§f§lJuros: ${(loanType.interest * 100).toFixed(1)}%\n\n§7Digite o valor desejado:`, loanType.max.toString(), "")
            .dropdown("§7parcelas:", ["§76 meses", "§712 meses", "§724 meses", "§736 meses"], 1);

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

        player.sendMessage(`§a Empréstimo aprovado!`);
        player.sendMessage(`§7Valor liberado: ${this.core.formatMoney(amount)}`);
        player.sendMessage(`§7Total a pagar: ${this.core.formatMoney(totalAmount)}`);
        player.sendMessage(`§7Parcelas: ${installments}x de ${this.core.formatMoney(monthlyPayment)}`);
        player.sendMessage(`§7Próximo pagamento: ${new Date(loan.nextPaymentDate).toLocaleDateString()}`);

        this.saveBankData();
    }

    showActiveLoanInfo(player, loan) {
        const form = new ActionFormData()
            .title("§7seu empréstimo ativo")
            .body(`§f§lInformações do empréstimo:\n\n§7Valor restante: §c${this.core.formatMoney(loan.remainingAmount)}\n§7Parcela mensal: §e${this.core.formatMoney(loan.monthlyPayment)}\n§7Parcelas restantes: §f${loan.remainingInstallments}\n§7Próximo pagamento: §f${new Date(loan.nextPaymentDate).toLocaleDateString()}\n\n§fOpções:`)
            .button("§7pagar parcela\npagar mensalidade")
            .button("§7quitar empréstimo\npagar tudo de uma vez")
            .button("§7detalhes completos\nver informações detalhadas");

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
            
            player.sendMessage(`§a Empréstimo quitado completamente!`);
            player.sendMessage(`§7Seu score de crédito foi melhorado!`);
        } else {
            player.sendMessage(`§a Parcela paga com sucesso!`);
            player.sendMessage(`§7Parcelas restantes: ${loan.remainingInstallments}`);
            player.sendMessage(`§7Próximo pagamento: ${new Date(loan.nextPaymentDate).toLocaleDateString()}`);
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
            .title("§7quitar empréstimo")
            .body(`§f§lConfirmar quitação?\n\n§7Valor total: §c${this.core.formatMoney(loan.remainingAmount)}\n§7Seu saldo: §a${this.core.formatMoney(bankBalance)}\n\n§aVocê receberá um bônus no score de crédito!`)
            .button1("§a QUITAR")
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
            
            player.sendMessage(`§a Empréstimo quitado antecipadamente!`);
            player.sendMessage(`§7Valor pago: ${this.core.formatMoney(loan.remainingAmount)}`);
            player.sendMessage(`§7Bônus no score de crédito aplicado!`);
            
            this.core.addTransaction(player.name, "loan_payoff", loan.remainingAmount, "Quitação antecipada de empréstimo", bankBalance - loan.remainingAmount);
            this.saveBankData();
        });
    }

    showInvestmentInterface(player) {
        const bankBalance = this.core.getBankBalance(player.name);
        const currentInvestment = this.investmentSystem.get(player.name);
        
        const form = new ActionFormData()
            .title("§7centro de investimentos")
            .body(`§f§lFaça seu dinheiro render!\n\n§7Saldo bancário: ${this.core.formatMoney(bankBalance)}\n${currentInvestment ? `§7Investimento ativo: ${this.core.formatMoney(currentInvestment.amount)}` : '§7Nenhum investimento ativo'}\n\n§fOpções de investimento:`)
            .button("§7🟢 poupança segura\nrendimento: 2% ao mês")
            .button("§7🟡 investimento moderado\nrendimento: 5% ao mês")
            .button("§7investimento arriscado\nrendimento: 10% ao mês")
            .button("§7resgatar investimento\nsacar valor investido");

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
            .title(`§7 ${investmentType.name.toUpperCase()}`)
            .textField(`§f§lRendimento: ${(investmentType.rate * 100).toFixed(1)}% ao mês\n§f§lRisco: ${investmentType.risk > 0 ? 'Alto' : 'Baixo'}\n§f§lMínimo: ${this.core.formatMoney(investmentType.minAmount)}\n\n§7Digite o valor para investir:`, investmentType.minAmount.toString(), "");

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

        player.sendMessage(`§a Investimento realizado com sucesso!`);
        player.sendMessage(`§7Tipo: §f${investmentType.name}`);
        player.sendMessage(`§7Valor: ${this.core.formatMoney(amount)}`);
        player.sendMessage(`§7Rendimento: §a${(investmentType.rate * 100).toFixed(1)}% ao mês`);
        player.sendMessage(`§7O rendimento será aplicado automaticamente!`);

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
            .title("§7resgatar investimento")
            .body(`§f§lSeu investimento:\n\n§7Tipo: §f${investment.type}\n§7Valor inicial: ${this.core.formatMoney(investment.originalAmount)}\n§7Valor atual: §a${this.core.formatMoney(currentValue)}\n§7Rendimento: §a${this.core.formatMoney(currentValue - investment.originalAmount)}\n§7Tempo ativo: §f${monthsActive} meses\n\n§fResgatar investimento?`)
            .button1("§a RESGATAR")
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

        player.sendMessage(`§a Investimento resgatado com sucesso!`);
        player.sendMessage(`§7Valor resgatado: ${this.core.formatMoney(currentValue)}`);
        player.sendMessage(`§7Lucro obtido: §a${this.core.formatMoney(profit)}`);
        player.sendMessage(`§7Novo saldo bancário: ${this.core.formatMoney(bankBalance + currentValue)}`);

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
            .title("§7️ configurações da conta")
            .body(`§f§lInformações da conta:\n\n§7Nome: §f${player.name}\n§7Tipo: §f${account.accountType}\n§7Score: §f${account.creditScore}/100\n§7Criada em: §f${new Date(account.createdDate).toLocaleDateString()}\n\n§fOpções:`)
            .button("§7️ upgrade de conta\nmelhorar tipo de conta")
            .button("§7relatório completo\nver estatísticas detalhadas")
            .button("§7melhorar score\ndicas para aumentar crédito");

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
            player.sendMessage("§a Você já possui a conta mais premium disponível!");
            return;
        }

        const form = new MessageFormData()
            .title("§7️ upgrade de conta")
            .body(`§f§lUpgrade disponível:\n\n§7De: §f${account.accountType}\n§7Para: §a${upgrade.next}\n§7Custo: §c${this.core.formatMoney(upgrade.cost)}\n§7Benefícios: §f${upgrade.benefits}\n\n§7Seu saldo: ${this.core.formatMoney(bankBalance)}\n\n§fRealizar upgrade?`)
            .button1("§a FAZER UPGRADE")
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

            player.sendMessage(`§a Upgrade realizado com sucesso!`);
            player.sendMessage(`§7Nova conta: §a${upgrade.next}`);
            player.sendMessage(`§7Score melhorado em 10 pontos!`);

            this.core.addTransaction(player.name, "account_upgrade", upgrade.cost, `Upgrade para conta ${upgrade.next}`, bankBalance - upgrade.cost);
            this.saveBankData();
        });
    }

    showAccountReport(player) {
        const account = this.getBankAccount(player.name);
        const stats = this.core.getPlayerStats(player.name);
        
        const report = `§6§l=== 📊 RELATÓRIO DA CONTA ===

§f§lInformações Gerais:
§7• Nome: §f${player.name}
§7• Tipo de Conta: §f${account.accountType}
§7• Score de Crédito: §f${account.creditScore}/100
§7• Membro desde: §f${new Date(account.createdDate).toLocaleDateString()}

§f§lMovimentação Financeira:
§7• Total depositado: ${this.core.formatMoney(account.totalDeposits)}
§7• Total sacado: ${this.core.formatMoney(account.totalWithdrawals)}
§7• Transferências enviadas: ${this.core.formatMoney(account.totalTransfersSent)}
§7• Transferências recebidas: ${this.core.formatMoney(account.totalTransfersReceived)}

§f§lPatrimônio Atual:
§7• Carteira: ${this.core.formatMoney(this.core.getWalletBalance(player.name))}
§7• Banco: ${this.core.formatMoney(this.core.getBankBalance(player.name))}
§7• Total: ${this.core.formatMoney(stats.totalWealth)}

§f§lHistórico de Crédito:
§7• Empréstimos totais: ${this.core.formatMoney(account.totalLoans)}
§7• Status atual: ${this.loanSystem.has(player.name) ? '§cEmpréstimo ativo' : '§aLivre de dívidas'}`;

        player.sendMessage(report);
    }

    showCreditTips(player) {
        const tips = `§6§l=== 🎯 DICAS PARA MELHORAR SEU SCORE ===

§f§l Ações que AUMENTAM o score:
§a• Pagar empréstimos em dia (+5 pontos)
§a• Quitar empréstimos antecipadamente (+25 pontos)
§a• Fazer upgrade de conta (+10 pontos)
§a• Manter saldo alto no banco (+1 ponto/mês)
§a• Usar serviços bancários regularmente (+2 pontos/mês)

§f§l Ações que DIMINUEM o score:
§c• Pegar empréstimos (-10 pontos temporário)
§c• Atrasar pagamentos (-20 pontos)
§c• Ter conta com saldo baixo (-1 ponto/mês)

§f§l Dicas especiais:
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
            loan_payoff: "§a💳",
            investment: "§a⬆",
            investment_withdraw: "§e⬇",
            account_upgrade: "§f⬆️"
        };
        return icons[type] || "§7🏦";
    }

    calculateNextPaymentDate() {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth.toISOString();
    }

    showBankHelp(player) {
        const help = `§6§l=== 🏦 AJUDA - SISTEMA BANCÁRIO ===

§f§lServiços Básicos:
§7• §e/economy bank §7- Abrir interface do banco
§7• §e!extrato §7- Ver movimentações

§f§lNPCs:
§7• §abanknpc §7- Acesso completo ao banco

§f§lFuncionalidades:
§7• Depósitos e saques
§7• Transferências bancárias (taxa 1%)
§7• Empréstimos com juros
§7• Investimentos com rendimento
§7• Sistema de score de crédito
§7• Upgrade de contas

§f§lTipos de Conta:
§7• §fBásica §7- Conta inicial
§7• §aPremium §7- Benefícios extras
§7• §bVIP §7- Serviços exclusivos
§7• §0Black §7- Conta premium máxima`;

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