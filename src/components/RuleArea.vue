<template>
    <div id="ruleArea" class="ruleArea">
        <rule-placeholder ref="rulesVM" v-for="aRulePlaceholder in rulesPlaceholders" :rule-placeholder-model="aRulePlaceholder"></rule-placeholder>
    </div>
</template>

<script>
import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore, globalBus} from '../store.js'
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
    background-color: orange;
}
</style>