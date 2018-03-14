"use strict";

var canvas;
var gl;

var uModel;
var uView;
var uProjection;
var uColor;
var speed = 0.1;
var zoom = 3;
var clockWise = false;

var vertexes = [
  // tri
  -0.5, 0.0, -0.5,
  0.0, 0.0, 0.5,
  0.5, 0.0, -0.5,

  // plane
  0.5, 0.0, 0.5,
  0.5, 0.0, -0.5,
  -0.5, 0.0, -0.5,
  -0.5, 0.0, 0.5
];

var indices = [
  // tri
  0, 1, 2,
  2, 1, 0,

  // plane
  3, 4, 5,
  3, 5, 6
];

var normals = [
  // tri
  0.0, 1.0, 0.0,
  0.0, 1.0, 0.0,
  0.0, 1.0, 0.0,

  // plane
  0.0, 1.0, 0.0,
  0.0, 1.0, 0.0,
  0.0, 1.0, 0.0,
  0.0, 1.0, 0.0
];

function tri() {
  return {
    index: 0,
    length: 6,
    model: mat4(),
    color: vec4([1.0, 1.0, 1.0, 1.0])
  };
}
function plane() {
  return {
    index: 6,
    length: 6,
    model: mat4(),
    color: vec4([1.0, 1.0, 1.0, 1.0])
  };
}

var view = mat4();
var projection = mat4();

var scene = [];

function getShader(name) {
  var script = document.getElementById(name);
  var source = script.text;
  var type = gl.VERTEX_SHADER;
  if (script.type == "x-shader/x-vertex") type = gl.VERTEX_SHADER;
  if (script.type == "x-shader/x-fragment") type = gl.FRAGMENT_SHADER;
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    var msg = "Vertex shader failed to compile.  The error log is:"
      + "<pre>" + gl.getShaderInfoLog(shader) + "</pre>";
    alert(msg);
  }
  return shader;
}

function getProgram(vertexShaderName, fragmentShaderName) {
  var program = gl.createProgram();

  var vertexShader = getShader(vertexShaderName);
  gl.attachShader(program, vertexShader);

  var fragmentShader = getShader(fragmentShaderName);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);
  return program;
}

window.onload = function () {
  canvas = document.getElementById('gl-canvas');
  gl = canvas.getContext('webgl');

  if (!gl) {
    alert('WebGL isn’t available');
  }

  projection = perspective(45.0, canvas.width / canvas.height, 0.1, 100.0);

  var t1 = tri();
  t1.model = mult(t1.model, translate(1, 1.5, 1.7));
  t1.model = mult(t1.model, rotate(270.0, [1.0, 0.0, 0.0]));
  t1.model = mult(t1.model, rotate(180.0, [0.0, 0.0, 1.0]));
  t1.color = vec4([0.0, 0.0, 1.0, 1.0]);

  var floor = plane();
  floor.model = mult(floor.model, scalem([10.0, 10.0, 10.0]));
  floor.color = vec4([0.89, 0.74, 0.4, 1.0]);

  var wall1 = plane();
  wall1.model = mult(wall1.model, rotate(90.0, [1.0, 0.0, 0.0]));
  wall1.model = mult(wall1.model, scalem([10.0, 10.0, 10.0]));
  wall1.color = vec4([0.5, 0.5, 1.0, 1.0]);

  var wall2 = plane();
  wall2.model = mult(wall2.model, rotate(270.0, [0.0, 0.0, 1.0]));
  wall2.model = mult(wall2.model, scalem([10.0, 10.0, 10.0]));
  wall2.color = vec4([0.45, 0.45, 0.9, 1.0]);

  scene.push(t1);
  scene.push(floor);
  scene.push(wall1);
  scene.push(wall2);

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST)
  gl.enable(gl.CULL_FACE);

  var program = getProgram('vertexShader', 'fragmentShader');
  gl.useProgram(program);

  var nBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

  var aNormal = gl.getAttribLocation(program, 'a_Normal');
  gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, true, 0, 0);
  gl.enableVertexAttribArray(aNormal);

  var vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexes), gl.STATIC_DRAW);

  var iBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  var aPosition = gl.getAttribLocation(program, 'a_Position');
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosition);

  uModel = gl.getUniformLocation(program, 'u_Model');
  uView = gl.getUniformLocation(program, 'u_View');
  uProjection = gl.getUniformLocation(program, 'u_Projection');
  uColor = gl.getUniformLocation(program, 'u_Color');

  var oldSpeed = speed;
  startButton.addEventListener("click", function(){
    
    if(speed > 0) {
      oldSpeed = speed;
      speed = 0;
    }
    else {
      speed = oldSpeed;
    }
  });

  directionButton.addEventListener("click", function(){
    clockWise = !clockWise;
  });

  zoomSlider.addEventListener("change", function(){
    zoom = this.value;
  });

  rotationSlider.addEventListener("change", function(){
    speed = this.value;
  });
  render();
}

var iteration = 0;
function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_LIST);

  var camera = scale(zoom, vec3(1.0, 1.0, 1.0));
  view = lookAt(camera, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));

  var direction = clockWise ? -1.0 : 1.0;
  scene[0].model = mult(scene[0].model, rotate(90*speed, [0.0, 0.0, direction]));

  scene.forEach(function (object) {
    gl.uniformMatrix4fv(uView, false, flatten(view));
    gl.uniformMatrix4fv(uProjection, false, flatten(projection));
    gl.uniformMatrix4fv(uModel, false, flatten(object.model));
    gl.uniform4fv(uColor, flatten(object.color));
    gl.drawElements(gl.TRIANGLES, object.length, gl.UNSIGNED_SHORT, object.index * 2);
  });

  iteration++;
  window.requestAnimationFrame(render, canvas);
}
