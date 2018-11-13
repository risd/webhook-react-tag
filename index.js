/**
 * Renders a React component as a string in place.
 *
 * Inspired by the [react-rails gem](https://github.com/reactjs/react-rails),
 * and renders templates consistent with their View Helper.
 *
 * @alias react
 *
 * @example
 * // Render a component with no props
 * {% react 'Header' %}
 * // <div data-react-component="Header">...</div>
 *
 * @example
 * // Render a component with some props
 * // props = { name: 'John' };
 * {% react 'HelloMessage' with props %}
 * // <div
 * //    data-react-component="HelloMessage"
 * //    data-react-props="{&quot;name&quot;:&quot;John&quot;}"
 * //    >
 * //    ...
 * //    </div>
 *
 * @example
 * // Render a component with props in a custom element
 * {% react 'HelloMessage' with props in 'div' %}
 * // <div data-...>...</div>
 *
 * @example
 * // Render a component with props in a more customized element
 * // el = { tag: 'div', class: 'foo', id: 'hello' };
 * {% react './ui/shared/HelloMessage' with props in el %}
 * // <div class="foo" id="hello" data-...>...</div>
 *
 * @param {string|var}    modulePath Path to ReactComponent module
 * @param {Literal}       [with]     Literal string "with"
 * @param {object}        [props]    Properties to pass to ReactComponent
 * @param {Literal}       [in]       Literal string "in"
 * @param {string|object} [tag]      String specifying tag to use as container,
 *                                   or an object describing such a tag. In the
 *                                   object, the "tag" key must be defined, and
 *                                   every other key will be attached as an
 *                                   attribute to the tag. Note also that
 *                                   "data-react-props" is a reserved key.
 */

// Modules
var React = require("react");
var ReactDOMServer = require("react-dom/server");
var components = {}
// Literals
var STR_WITH = "with";
var STR_OBJ_OPEN = "{";
var STR_OBJ_CLOSE = "}";
var STR_IN = "in";
// Swig Tag Interface def
var name = "react";
var ends = false;
var blockLevel = false;

/**
 * Tag compiler
 */
function compile(compiler, args, content, parents, options) {
  var componentRoot = options.reactComponentRoot || "./";
  var componentName = args.shift();
  var props;
  var container;
  var js = "";
  var arg;

  // Parse remaining arguments
  while ((arg = args.shift())) {
    switch (arg) {
      case STR_WITH:
        props = args.shift();
        if (props === STR_OBJ_OPEN) {
          var objOpenings = 1;
          var objClosings = 0;
          var objParts = STR_OBJ_OPEN;
          while ((objPart = args.shift())) {
            if (objPart === STR_OBJ_OPEN) {
              objOpenings += 1;
            } else if (objPart === STR_OBJ_CLOSE) {
              objClosings += 1;
            }

            objParts += objPart;

            if (objPart === STR_OBJ_CLOSE && objOpenings === objClosings) {
              props = objParts.slice(0);
              break;
            }
          }
        }
        break;
      case STR_IN:
        container = args.shift();
        // TODO: simple "string" for container arg (as tagname)
        break;
      default:
        var err = 'Unexpected argument "' + arg + '" in react tag.';
        throw new Error(err);
    }
  }

  // Create start tag for containing node
  js += "_output += (function(props, container) {";
  js += "props = props || {};";
  js += "container = container || { tag: 'div' };";
  js += "var __o = '<' + container.tag;";
  js += 'var __p = JSON.stringify(props).replace(/"/g, "&quot;");';
  js += "for (var key in container) {";
  js += "var val;";
  js += "if (container.hasOwnProperty(key) && key !== 'tag') {";
  js += "val = container[key].replace('\"', '&quot;');";
  js += "__o += ' ' + key + '=\"' + val + '\"';";
  js += "}";
  js += "}";
  // Add the react component module (full path)
  js += "__o += ' data-react-component=\"" + componentName + "\"';";
  // Add the serialized properties as an attribute
  js += "__o += ' data-react-props=\"' + __p + '\">';";
  // Render the React component via an extension (from the local environment)
  js += "__o += _ext.react('" + componentName + "', props);";
  // Close containing node
  js += "__o += '</' + container.tag + '>';";
  js += "return __o;";
  js += "})(" + props + ", " + container + ");\n";
  // ... Hope that works!

  return js;
}

/**
 * Tag parser
 */
function parse(str, line, parser, types, stack, opts) {
  var componentName;

  parser.on(types.STRING, function(token) {
    if (!componentName) {
      componentName = token.match.replace(/(^['"]|['"]$)/g, "");
      this.out.push(componentName);
      return;
    }

    return true;
  });

  parser.on(types.VAR, function(token) {
    if (!componentName) {
      componentName = token.match;
      return true;
    }

    if (token.match === STR_WITH || token.match === STR_IN) {
      this.out.push(token.match);
      return false;
    }

    return true;
  });

  return true;
}

/**
 * Render a React component to a string with the specified props.
 *
 * Add this as an extension to swig in order to support rendering components
 * during template compilation.
 *
 * @param  {string} componentName Name of React component.
 * @param  {object} [props]       Properties to pass to React component.
 * @return {string}               Prerendered React.
 */
function renderReactComponentToString(componentName, props) {
  if (components.hasOwnProperty(componentName)) {
    var Component = components[componentName];
    var reactElement = React.createElement(Component, props);
    return ReactDOMServer.renderToString(reactElement);
  } else {
    console.error(`"${componentName}" component does not exist in components supplied.
      Try extending @risd/webhook-react-tag with an object that includes ${ componentName }.
      ie: require('@risd/webhook-react-tag').components( { ${ componentName } } )`);
  }
}

module.exports = {
  name: name,
  ends: ends,
  blockLevel: blockLevel,
  compile: compile,
  parse: parse,
  extension: renderReactComponentToString,
  components: extendComponents,
  useTag: useTag,
};


/**
 * Helper to extend the possible components that the react
 * tag has access to rendering.
 *
 * Expects the arguments to be objects that contains keys
 * that represent component names & their values being the
 * component.
 * 
 * @return {object} this  Returns the current object context;
 */
function extendComponents () {
  for ( argumentIndex in arguments ) {
    var componentObject = arguments[ argumentIndex ]
    if ( typeof componentObject !== 'object' ) {
      throw new Error( '`extendComponents` expects objects to be passed in.' )
    }
    Object.assign( components, componentObject )
  }
  return this;
}


/**
 * Helper to enable react tag on a swig instance.
 *
 * @example
 * var swig = require('swig');
 * var swigReact = require('swig-react');
 * swigReact.useTag(swig);
 *
 * @param  {swig}   swig         Swig instance
 * @param  {string} [customName] Optional custom name to use for tag. Default
 *                               is "react".
 * @return {undefined}
 */
function useTag (swig, customName) {
  swig.setExtension(name, renderReactComponentToString);
  swig.setTag(customName || name, parse, compile, ends, blockLevel);
}
