# risd/webhook-react-tag

An `npm` module that exports a `@risd/webhook-generate` compatible interface for rendering `react` components within `swig`.

### Install

`npm install @risd/webhook-react-tag`

### Usage

`require('@risd/webhook-react-tag')` can be dropped into the `Gruntfile.js` configuration of `@risd/webhook-generate`. `@risd/webhook-react-tag` has the method `components` that accepts objects that include react components, keyed by their name.

```
grunt.initConfig({
  swig: {
    tags: [
      require("@risd/webhook-react-tag")
        .components(require('@risd/ui'))
    ],
    filters: [],
    functions: []
  }
});
```

This would allow you to use the following syntax in your `swig` templates:

```
{% react "FormattedDate" with { start: "2018-07-02" } %}
```

Where `FormattedDate` is a top level key name, within one of the objects passed into `require("@risd/webhook-react-tag").components`, whose value is the `FormattedDate` component that will be rendered.
