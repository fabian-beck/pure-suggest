<template>
    <div>
        <v-btn icon href="https://twitter.com/pure_suggest" v-tippy="{content: 'Follow us on Twitter', placement: 'bottom'}" flat>
            <v-icon>mdi-twitter</v-icon>
        </v-btn>
        <v-btn icon href="https://medium.com/@pure_suggest" v-tippy="{content: 'Read more on Medium', placement: 'bottom'}" flat>
            <v-icon>mdi-post</v-icon>
        </v-btn>
        <v-btn icon href="https://github.com/fabian-beck/pure-suggest" v-tippy="{content: 'Contribute on GitHub', placement: 'bottom'}" flat>
            <v-icon>mdi-github</v-icon>
        </v-btn>
    </div>
</template>