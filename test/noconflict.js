(function() {

  module("Backbone.noConflict");

  test('noConflict', 2, function() {
    var noconflictBackbone = Bedrock.noConflict();
    equal(window.Bedrock, undefined, 'Returned window.Bedrock');
    window.Bedrock = noconflictBackbone;
    equal(window.Bedrock, noconflictBackbone, 'Bedrock is still pointing to the original Bedrock');
  });

})();
