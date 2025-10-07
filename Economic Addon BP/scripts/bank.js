import { world, system } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';

export class BankSystem {
    constructor(economyCore) {
        this.core = economyCore;
        this.setupEvents();
        world.sendMessage("§a[Bank System] Sistema bancário ativo!");
    }

    setupEvents() {
        if (world.beforeEvents?.playerInteractWithEntity) {
            world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
                const { player, target: entity } = event;
                if (entity.typeId !== "minecraft:npc") return;
                if (!entity.getTags().includes("banknpc")) return;
                event.cancel = true;
                system.run(() => this.openBankInterface(player));
            });
        }
    }

    openBankInterface(player) {
        const balance = this.core.getWalletBalance(player.name);
        const bankBalance = this.core.getBankBalance(player.name);

        const form = new ActionFormData()
            .title("§7banco")
            .body(`§8Seu banco:\n\n§8 Carteira: ${this.core.formatMoney(balance)}\n§8🏦 Banco: ${this.core.formatMoney(bankBalance)}\n\n§8Escolha uma opção:`)
            .button("§7depositar dinheiro")
            .button("§7sacar dinheiro")
            .button("§7transferir para outro jogador")
            .button("§7ver extrato bancário");

        form.show(player).then((response) => {
            if (response.canceled) return;
            switch (response.selection) {
                case 0: this.showDepositForm(player); break;
                case 1: this.showWithdrawForm(player); break;
                case 2: this.showTransferForm(player); break;
                case 3: this.showBankStatement(player); break;
            }
        });
    }

    showDepositForm(player) {
        // ...implemente depósito...
        player.sendMessage("§eFunção de depósito em desenvolvimento.");
    }

    showWithdrawForm(player) {
        // ...implemente saque...
        player.sendMessage("§eFunção de saque em desenvolvimento.");
    }

    showTransferForm(player) {
        // ...implemente transferência...
        player.sendMessage("§eFunção de transferência em desenvolvimento.");
    }

    showBankStatement(player) {
        // ...implemente extrato...
        player.sendMessage("§eFunção de extrato em desenvolvimento.");
    }
}
