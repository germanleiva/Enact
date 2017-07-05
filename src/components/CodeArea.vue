<template>
    <div id="codeArea" class="codeArea">

        <div class="columns">
            <div class="column stateColumn" v-for="eachState in states">
              {{ eachState.name }}
              <br/>
              <label>Guard---</label>
              <textarea v-model="eachState.guard"></textarea>
              <br/>
              <label>Actions--</label>
              <textarea v-model="eachState.actions"></textarea>
              <br/>
              <label>To states</label>
              <textarea v-model="eachState.to"></textarea>


            </div>
        </div>
    </div>
</template>

<script>
import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore, globalBus, RulePlaceholderModel, State} from '../store.js'

export default {
    name: 'code-area',
    data: function() {
        return {
            states: [ new State("began"),new State("changed"),new State("ended")],
        }
    },
    components: {

    },
    methods: {
        // addNewRule() {
        //     globalStore.ruleCounter++;
        //     var newRulePlaceholder = new RulePlaceholderModel(globalStore.ruleCounter)

        //     globalStore.rulesPlaceholders.push(newRulePlaceholder);

        //     globalStore.socket.emit('message-from-desktop', { type: "NEW_RULE", message: newRulePlaceholder.toJSON() })
        // }
    },
    computed: {
        // rulesPlaceholders: function() {
        //     return globalStore.rulesPlaceholders
        // }

    },
    mounted: function() {
    }
}
</script>

<style>
.codeArea {
/*    width: 100%;
    background-color: #eeeeee;
    display: flex;
    flex-wrap: wrap;
    align-content:flex-start;*/
    width: 70%;
}

.stateColumn {
    width: 200px;
}
</style>