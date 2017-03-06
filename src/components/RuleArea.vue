<template>
    <div id="ruleArea" class="ruleArea">
        <rule-placeholder ref="rulesVM" v-for="aRulePlaceholder in rulesPlaceholders" :rule-placeholder-model="aRulePlaceholder"></rule-placeholder>
    </div>
</template>
<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore} from '../store.js'
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
    }
}
</script>
<style>
.ruleArea {
    width: 100%;
    background-color: orange;
}
</style>