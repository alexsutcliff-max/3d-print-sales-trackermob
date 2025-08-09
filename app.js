// App code placeholder so the page renders; you can replace with your full app later.
const { useState } = React;
function App(){
  const [ok] = useState(true);
  return React.createElement('div',{className:'max-w-xl mx-auto bg-white p-4 rounded-2xl shadow'},
    React.createElement('h1',{className:'text-2xl font-bold mb-2'},'Print Sales Tracker'),
    React.createElement('p',null,'App booted via Babel external file (app.js). Now we can swap in full code.')
  );
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
