<template>
    <div class='box' style="display:flex; margin: 10px">
        <div v-on:drop="dropForInput" v-on:dragover="dragOverForInput" style="width: 50%; height: 50px; background-color:red"></div>
        <div v-on:drop="dropForOutput" v-on:dragover="dragOverForOutput" style="width: 50%; height: 50px; background-color:gray"></div>
    </div>
</template>
<script>

import {globalStore} from '../store.js'
import Rule from './Rule.vue'

export default {
    name: 'rule-area',
    data: function() {
        return {

        }
    },
    components: {
        'rule':Rule
    },
    methods: {
        dropForInput(event) {
            event.preventDefault();
            var data = event.dataTransfer.getData("text/input");
            console.log("Rule >> dropForInput" + data)
        },
        dropForOutput(event) {
            event.preventDefault();
            var data = event.dataTransfer.getData("text/output");
            console.log("Rule >> dropForOutput" + data)
        },
        dragOverForInput(event) {
            var dataType = event.dataTransfer.types;
            console.log("dragOverForInput >> " + dataType)
            if (dataType == "text/input") {
                event.preventDefault()
            }
        },
        dragOverForOutput(event) {
            var dataType = event.dataTransfer.types;
            console.log("dragOverForOutput >> " + dataType)

            if (dataType == "text/output") {
                event.preventDefault()
            }
        }
    },
    computed: {
        rulesModel: function() {
            return globalStore.rules
        }
    }
}
</script>