import { world, system, ItemStack } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';

// Sistema de Dinheiro Físico
export class MoneySystem {
    constructor(economyCore) {
        this.core = economyCore;
        this.moneyItems = this.initializeMoneyItems();
        
        this.setupEvents();
        world.sendMessage("§a[Money System] Sistema de dinheiro físico ativo!");
    }

     initializeMoneyItems() {
        return {
            // Moedas
            coin_1: { value: 1, name: "Moeda de 1$", item: "economic:coin_1", color: "§e" },
            coin_5: { value: 5, name: "Moeda de 5$", item: "economic:coin_2", color: "§7" },
            coin_10: { value: 10, name: "Moeda de 10$", item: "economic:coin_3", color: "§6" },
            
            // Notas
            note_20: { value: 20, name: "Nota de 20$", item: "economic:note_4", color: "§a" },
            note_50: { value: 50, name: "Nota de 50$", item: "economic:note_5", color: "§b" },
            note_100: { value: 100, name: "Nota de 100$", item: "economic:note_6", color: "§d" },
            note_500: { value: 500, name: "Nota de 500$", item: "economic:note_7", color: "§c" },
            note_1000: { value: 1000, name: "Nota de 1000$", item: "economic:note_8", color: "§f" }
        };
    }

    setupEvents() {
        // Interação com NPC de dinheiro
        if (world.beforeEvents?.playerInteractWithEntity) {
            world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
                const { player, target: entity } = event;
                
                if (entity.typeId !== "minecraft:npc") return;
                if (!entity.getTags().includes("moneynpc")) return;
                
                event.cancel = true;
                system.run(() => this.openMoneyInterface(player));
            });
        }
    }

    openMoneyInterface(player) {
        const balance = this.core.getWalletBalance(player.name);
        const bankBalance = this.core.getBankBalance(player.name);
        
        const form = new ActionFormData()
            .title("§8 GERENCIADOR DE DINHEIRO")
            .body(`§8Seus recursos financeiros:\n\n§8 Carteira: ${this.core.formatMoney(balance)}\n§8 Banco: ${this.core.formatMoney(bankBalance)}\n§8 Total: ${this.core.formatMoney(balance + bankBalance)}\n\n§8Escolha uma opção:`)
            .button("§8 Converter para dinheiro físico")
            .button("§8 Converter itens em saldo")
            .button("§8 Ver extrato")
            .button("§8 Transferir dinheiro")
            .button("§8 Tabela de valores");

        form.show(player).then((response) => {
            if (response.canceled) return;

            switch (response.selection) {
                case 0:
                    this.showConvertToPhysicalForm(player);
                    break;
                case 1:
                    this.showConvertToDigitalForm(player);
                    break;
                case 2:
                    this.showTransactionHistory(player);
                    break;
                case 3:
                    this.showTransferForm(player);
                    break;
                case 4:
                    this.showMoneyTable(player);
                    break;
            }
        });
    }

    showConvertToPhysicalForm(player) {
        const balance = this.core.getWalletBalance(player.name);
        
        if (balance <= 0) {
            player.sendMessage("§c Você não tem dinheiro para converter!");
            return;
        }

        const form = new ModalFormData()
            .title("§2§l CONVERTER PARA FÍSICO")
            .textField(`§8Saldo disponível: ${this.core.formatMoney(balance)}\n\n§8Digite o valor para converter em dinheiro físico:`, balance.toString(), "");

        form.show(player).then((response) => {
            if (response.canceled) return;

            const amount = parseInt(response.formValues[0]);
            
            if (!this.core.isValidAmount(amount)) {
                player.sendMessage("§c Valor inválido!");
                return;
            }

            if (!this.core.canAfford(player.name, amount)) {
                player.sendMessage("§c Saldo insuficiente!");
                return;
            }

            this.convertToPhysicalMoney(player, amount);
        });
    }

    convertToPhysicalMoney(player, amount) {
        if (!this.core.removeMoney(player.name, amount, "Conversão para dinheiro físico")) {
            player.sendMessage("§c Erro na conversão!");
            return;
        }

        const inventory = player.getComponent("minecraft:inventory")?.container;
        if (!inventory) {
            // Devolver o dinheiro se não conseguir acessar o inventário
            this.core.addMoney(player.name, amount, "Devolução por erro de inventário");
            player.sendMessage("§c Erro ao acessar inventário!");
            return;
        }

        const moneyBreakdown = this.calculateOptimalBreakdown(amount);
        let totalGiven = 0;

        for (const [moneyType, count] of Object.entries(moneyBreakdown)) {
            if (count > 0) {
                const moneyData = this.moneyItems[moneyType];
                const item = new ItemStack(moneyData.item, count);
                
                // Adicionar lore personalizada para identificar como dinheiro
                item.setLore([
                    `${moneyData.color}${moneyData.name}`,
                    `§8Valor: ${this.core.formatMoney(moneyData.value)}`,
                    `§8Dinheiro oficial do servidor`
                ]);

                inventory.addItem(item);
                totalGiven += moneyData.value * count;
            }
        }

        player.sendMessage(`§a✅ Conversão realizada com sucesso!`);
        player.sendMessage(`§8Valor convertido: ${this.core.formatMoney(totalGiven)}`);
        player.sendMessage(`§8Itens adicionados ao inventário`);
        
        this.showBreakdownMessage(player, moneyBreakdown);
    }

    calculateOptimalBreakdown(amount) {
        const breakdown = {};
        let remaining = amount;

        // Ordem decrescente de valores
        const moneyTypes = [
            'note_1000', 'note_500', 'note_100', 'note_50', 'note_20',
            'coin_10', 'coin_5', 'coin_1'
        ];

        for (const type of moneyTypes) {
            const value = this.moneyItems[type].value;
            const count = Math.floor(remaining / value);
            
            if (count > 0) {
                breakdown[type] = count;
                remaining -= count * value;
            } else {
                breakdown[type] = 0;
            }
        }

        return breakdown;
    }

    showBreakdownMessage(player, breakdown) {
        let message = "§8 DINHEIRO RECEBIDO:\n";
        
        for (const [type, count] of Object.entries(breakdown)) {
            if (count > 0) {
                const moneyData = this.moneyItems[type];
                message += `§f• ${count}x ${moneyData.color}${moneyData.name}\n`;
            }
        }
        
        player.sendMessage(message);
    }

    showConvertToDigitalForm(player) {
        const inventory = player.getComponent("minecraft:inventory")?.container;
        if (!inventory) {
            player.sendMessage("§c Erro ao acessar inventário!");
            return;
        }

        const moneyItems = this.scanInventoryForMoney(inventory);
        const totalValue = this.calculateTotalValue(moneyItems);

        if (totalValue <= 0) {
            player.sendMessage("§c Você não possui dinheiro físico para converter!");
            return;
        }

        const form = new ActionFormData()
            .title("§8🪙 Converter para digital")
            .body(`§8Dinheiro físico encontrado:\n\n${this.formatMoneyItemsList(moneyItems)}\n§8Valor total: ${this.core.formatMoney(totalValue)}\n\n§8Converter tudo para saldo digital?`)
            .button("§8Converter tudo")
            .button("§8Cancelar");

        form.show(player).then((response) => {
            if (response.canceled || response.selection === 1) return;

            this.convertToDigitalMoney(player, moneyItems, totalValue);
        });
    }

    scanInventoryForMoney(container) {
        const foundMoney = {};
        
        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i);
            if (!item) continue;

            const moneyType = this.identifyMoneyItem(item);
            if (moneyType) {
                if (!foundMoney[moneyType]) {
                    foundMoney[moneyType] = 0;
                }
                foundMoney[moneyType] += item.amount;
            }
        }

        return foundMoney;
    }

    identifyMoneyItem(item) {
        const lore = item.getLore();
        if (!lore || lore.length < 3) return null;
        if (!lore[2].includes("Dinheiro oficial do servidor")) return null;

        for (const [type, data] of Object.entries(this.moneyItems)) {
            if (item.typeId === data.item && lore[0].includes(data.name)) {
                return type;
            }
        }

        return null;
    }

    calculateTotalValue(moneyItems) {
        let total = 0;
        for (const [type, count] of Object.entries(moneyItems)) {
            total += this.moneyItems[type].value * count;
        }
        return total;
    }

    formatMoneyItemsList(moneyItems) {
        let list = "";
        for (const [type, count] of Object.entries(moneyItems)) {
            if (count > 0) {
                const data = this.moneyItems[type];
                list += `§8• ${count}x ${data.color}${data.name} §8(${this.core.formatMoney(data.value * count)})\n`;
            }
        }
        return list;
    }

    convertToDigitalMoney(player, moneyItems, totalValue) {
        const inventory = player.getComponent("minecraft:inventory")?.container;
        if (!inventory) {
            player.sendMessage("§c Erro ao acessar inventário!");
            return;
        }

        // Remover itens do inventário
        for (let i = 0; i < inventory.size; i++) {
            const item = inventory.getItem(i);
            if (!item) continue;

            const moneyType = this.identifyMoneyItem(item);
            if (moneyType && moneyItems[moneyType] > 0) {
                const removeAmount = Math.min(item.amount, moneyItems[moneyType]);
                moneyItems[moneyType] -= removeAmount;

                if (removeAmount >= item.amount) {
                    inventory.setItem(i, undefined);
                } else {
                    const newItem = item.clone();
                    newItem.amount -= removeAmount;
                    inventory.setItem(i, newItem);
                }
            }
        }

        // Adicionar ao saldo digital
        this.core.addMoney(player.name, totalValue, "Conversão de dinheiro físico");

        player.sendMessage(`§a✅ Conversão realizada com sucesso!`);
        player.sendMessage(`§8Valor convertido: ${this.core.formatMoney(totalValue)}`);
        player.sendMessage(`§8Novo saldo: ${this.core.formatMoney(this.core.getWalletBalance(player.name))}`);
    }

    showBalance(player) {
        const balance = this.core.getWalletBalance(player.name);
        const bankBalance = this.core.getBankBalance(player.name);
        const stats = this.core.getPlayerStats(player.name);
        
        const message = `§6§l=== ${this.core.getMoneyIcon(balance + bankBalance)} SEU DINHEIRO ===

§8Saldos:
§8 Carteira: ${this.core.formatMoney(balance)}
§8 Banco: ${this.core.formatMoney(bankBalance)}
§8 Total: ${this.core.formatMoney(stats.totalWealth)}

§8Estatísticas:
§8 Total ganho: ${this.core.formatMoney(stats.totalEarned)}
§8 Total gasto: ${this.core.formatMoney(stats.totalSpent)}
§8 Transações: ${stats.transactionCount}

§8Use !money-help para ver comandos`;

        player.sendMessage(message);
    }

    handlePayCommand(player, message) {
        const parts = message.split(" ");
        if (parts.length !== 3) {
            player.sendMessage("§c Use: !pay <jogador> <valor>");
            return;
        }

        const targetName = parts[1];
        const amount = parseInt(parts[2]);

        if (!this.core.isValidAmount(amount)) {
            player.sendMessage("§c Valor inválido!");
            return;
        }

        if (targetName === player.name) {
            player.sendMessage("§c Você não pode pagar para si mesmo!");
            return;
        }

        if (!this.core.transferMoney(player.name, targetName, amount, `Pagamento para ${targetName}`)) {
            player.sendMessage("§c Dinheiro insuficiente!");
            return;
        }

        player.sendMessage(`§a✅ Pagamento realizado com sucesso!`);
        player.sendMessage(`§8Para: §f${targetName}`);
        player.sendMessage(`§8Valor: ${this.core.formatMoney(amount)}`);
        player.sendMessage(`§8Saldo restante: ${this.core.formatMoney(this.core.getWalletBalance(player.name))}`);

        // Notificar o destinatário
        const targetPlayer = world.getPlayers().find(p => p.name === targetName);
        if (targetPlayer) {
            targetPlayer.sendMessage(`§a Você recebeu ${this.core.formatMoney(amount)} de §f${player.name}§a!`);
        }
    }

    showTransferForm(player) {
        const balance = this.core.getWalletBalance(player.name);
        
        const form = new ModalFormData()
            .title("§8💸 TRANSFERIR DINHEIRO")
            .textField("§8Nome do destinatário:", "Steve", "")
            .textField(`§8Seu saldo: ${this.core.formatMoney(balance)}\n\n§8Valor da transferência:`, "100", "");

        form.show(player).then((response) => {
            if (response.canceled) return;

            const targetName = response.formValues[0].trim();
            const amount = parseInt(response.formValues[1]);

            if (!targetName || targetName === player.name) {
                player.sendMessage("§c Nome do destinatário inválido!");
                return;
            }

            if (!this.core.isValidAmount(amount)) {
                player.sendMessage("§c Valor inválido!");
                return;
            }

            if (!this.core.transferMoney(player.name, targetName, amount)) {
                player.sendMessage("§c Dinheiro insuficiente!");
                return;
            }

            player.sendMessage(`§a✅ Transferência realizada com sucesso!`);
            player.sendMessage(`§8Para: §f${targetName}`);
            player.sendMessage(`§8Valor: ${this.core.formatMoney(amount)}`);

            const targetPlayer = world.getPlayers().find(p => p.name === targetName);
            if (targetPlayer) {
                targetPlayer.sendMessage(`§a Transferência recebida de §f${player.name}§a: ${this.core.formatMoney(amount)}`);
            }
        });
    }

    showTransactionHistory(player) {
        const transactions = this.core.getPlayerTransactions(player.name, 10);
        
        if (transactions.length === 0) {
            player.sendMessage("§8Nenhuma transação encontrada.");
            return;
        }

        let history = `§6§l===  HISTÓRICO DE TRANSAÇÕES ===\n\n`;
        
        transactions.forEach((transaction, index) => {
            const typeIcon = this.getTransactionIcon(transaction.type);
            const date = new Date(transaction.timestamp).toLocaleDateString();
            
            history += `§f${index + 1}. ${typeIcon} ${transaction.description}\n`;
            history += `§8   ${this.core.formatMoney(transaction.amount)} - ${date}\n`;
        });

        player.sendMessage(history);
    }

    getTransactionIcon(type) {
        const icons = {
            income: "§a⬆",
            expense: "§c⬇",
            bank_deposit: "§b🏦⬆",
            bank_withdraw: "§b🏦⬇",
            bank_transfer_in: "§e🏦➡",
            bank_transfer_out: "§e🏦⬅"
        };
        return icons[type] || "§8↔";
    }

    showMoneyTable(player) {
        const table = `§6§l===  TABELA DE VALORES ===

§8Moedas:
§e• Moeda de 1$: §8Pepita de Ouro
§8• Moeda de 5$: §8Pepita de Ferro  
§6• Moeda de 10$: §8Lingote de Cobre

§8Notas:
§a• Nota de 20$: §8Papel
§b• Nota de 50$: §8Livro
§d• Nota de 100$: §8Livro Encantado
§c• Nota de 500$: §8Etiqueta
§f• Nota de 1000$: §8Estrela do Nether

§8Dicas:
§8• Use NPCs com tag "moneynpc" para conversões
§8• Dinheiro físico pode ser perdido se morrer
§8• Dinheiro digital é mais seguro`;

        player.sendMessage(table);
    }

    showMoneyHelp(player) {
        // Atualize para explicar uso por NPC
        const help = `§6§l===  AJUDA - SISTEMA DE DINHEIRO ===

§8NPCs:
§8• §amoneynpc §8- Gerenciar dinheiro físico/digital

§8Funcionalidades:
§8• Converter saldo em dinheiro físico (itens)
§8• Converter dinheiro físico em saldo digital
§8• Transferir dinheiro entre jogadores
§8• Ver histórico de transações

§8Como usar:
§8• Interaja com NPCs com tag "moneynpc" para abrir o menu de dinheiro.
§8• Escolha a opção desejada pelo menu UI.`;

        player.sendMessage(help);
    }
}