$('#export-img').on('click', function(e){
    e.preventDefault();

    html2canvas($('.lego_main'), {
      onrendered: function(canvas) {
          var dataURL= canvas.toDataURL();

          var data = encodeURIComponent(dataURL);

          $("body").append("<iframe src='/screenshot?base64=" + data + "' style='display: none;' ></iframe>");
      }
    });
});

