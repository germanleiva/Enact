<template>
    <span v-on:mousedown="mouseDown">CHAN</span>
</template>

<script>

import {extendArray} from '../collections.js'
extendArray(Array);
import {globalStore} from '../store.js'

export default {
    name: 'text-mark',
    // props: ['content'],
    data: function() {
        return {}
    },
    computed: {

    },
    methods: {
        mouseDown: function(e) {
            e.preventDefault()
            e.stopPropagation();
            console.log("hoveringgg")
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