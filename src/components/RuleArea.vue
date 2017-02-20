<template>
    <div id="ruleArea" class="ruleArea">
        <rule ref="rulesVM" v-for="aRuleModel in rulesModel" :rule-model="aRuleModel"></rule>
    </div>
</template>
<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore} from '../store.js'
import Rule from './Rule.vue'

export default {
    name: 'rule-area',
    data: function() {
        return {

        }
    },
    components: {
        Rule
    },
    methods: {

    },
    computed: {
        rulesModel: function() {
            return globalStore.rules
        }
    }
}
</script>
<style>
.ruleArea {
    width: 100%;
    background-color: orange;
}
</style>