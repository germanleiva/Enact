<template>
    <span v-on:mouseover="mouseOver" v-on:mouseout="mouseOut">CHAN</span>
</template>

<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore} from '../store.js'

export default {
    name: 'text-mark',
    props: ['visualState','object','propertyName'],
    data: function() {
        return {}
    },
    computed: {

    },
    methods: {
        mouseOver: function(e) {
            e.preventDefault()
            e.stopPropagation();
            this.object.highlight = true
        },
        mouseOut: function(e) {
            e.preventDefault()
            e.stopPropagation();
            this.object.highlight = false
        }
    }
}
</script>

<style scoped>

span {
    background-color: red;
}

span:hover {
    background-color: yellow;
}
</style>