<template>
    <div id="ruleArea" class="ruleArea">
        <rule-placeholder ref="rulesVM" v-for="aRulePlaceholder in rulesPlaceholders" :rule-placeholder-model="aRulePlaceholder"></rule-placeholder>
        <a class="button is-alone newRule" v-on:click="addNewRule"><span class="icon is-small"><i class="fa fa-cubes"></i></span><span>add new rule</span></a>
    </div>
</template>

<script>
import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore, globalBus, RulePlaceholderModel} from '../store.js'
import RulePlaceholder from './RulePlaceholder.vue'

export default {
    name: 'rule-area',
    data: function() {
        return {

        }
    },
    components: {
        RulePlaceholder
    },
    methods: {
        addNewRule() {
            globalStore.ruleCounter++;
            var newRulePlaceholder = new RulePlaceholderModel(globalStore.ruleCounter)

            globalStore.rulesPlaceholders.push(newRulePlaceholder);

            globalStore.socket.emit('message-from-desktop', { type: "NEW_RULE", message: newRulePlaceholder })
        }
    },
    computed: {
        rulesPlaceholders: function() {
            return globalStore.rulesPlaceholders
        }
    },
    mounted: function() {
        globalBus.$on('message-from-device-ACTIVE_RULE', function(data) {
            let ruleVMFound = this.$refs.rulesVM.find(aRuleVM => aRuleVM.rulePlaceholderModel.id == data.id)
            if (ruleVMFound) {
                ruleVMFound.isActive = true
            } else {
                console.log("WEIRD!! ACTIVE_RULE We modified in the mobile a rule that's not present in the desktop")
            }
        }.bind(this));

        globalBus.$on('message-from-device-DEACTIVE_RULE', function(data) {
            let ruleVMFound = this.$refs.rulesVM.find(aRuleVM => aRuleVM.rulePlaceholderModel.id == data.id)
            if (ruleVMFound) {
                ruleVMFound.isActive = false
            } else {
                console.log("WEIRD!! DEACTIVE_RULE We modified in the mobile a rule that's not present in the desktop")
            }
        }.bind(this));
    }
}
</script>

<style>
.ruleArea {
    width: 100%;
    background-color: #eeeeee;
}
.newRule{
    display: flex !important;
    margin-top: 5px;
}
</style>