window.onload=function(){
    var eleccion = null;
    var candidatura = null;
    var nivCandidatura = null;
    var departamento = null;
    var distrito = null;
    var zona = null;
    var timer = null;
    var resultadosDiv = $("#Resultados");
    var templateResultados = "resultadosTemp";
    var selectEleccion = $("#select-eleccion");
    var selectCandidatura =$("#select-candidatura");
    var selectDepartamento = $("#select-departamento");
    var selectDistrito = $("#select-distrito");
    var selectZona = $("#select-zona");
    var actualizar = $("#btn-actualizar");
    window.barras = false;
    'use strict';
    var render = function (_data, _target, _template) {
        var result;
        try {
            var result = tmpl(_template, _data);
        } catch (e) {
            var result = tmpl('tmpl-error', e);
        }
        _target.html(result);
    }
    function clearData(){
        if(window.barras){window.barras.destroy();}
        resultadosDiv.html(""); 
    }
    function drawBarras(resultados){
        var candidatosLabels = [];
        var candidatosPorc = [];
        var candidatosColor = [];
        Chart.defaults.global.scaleLabel= "<%=value%>%";
        Chart.defaults.global.tooltipTemplate= "<%if (label){%><%=label%>: <%}%><%= value %>%"
        for(candidato in resultados["candidatos"]){
            candidatosLabels.push('Lista ' + resultados["candidatos"][candidato]["numLista"]);
            candidatosPorc.push((resultados["candidatos"][candidato]["votos"]*100/resultados["totales"]["totalVotos"]).toFixed(2));
            candidatosColor.push(resultados["candidatos"][candidato]["colLista"]);
        }
        var barChartData = {
            labels : candidatosLabels,
            datasets : [
            {
                fillColor : "rgba(220,220,220,0.5)",
                strokeColor : "rgba(220,220,220,0.8)",
                highlightFill: "rgba(220,220,220,0.75)",
                highlightStroke: "rgba(220,220,220,1)",
                data : candidatosPorc
            },
            ]
        }
        if(window.barras){window.barras.destroy();}
        var target = document.getElementById("barras").getContext("2d");
        window.barras = new Chart(target).Bar(barChartData, {
            responsive : true
        });
        for(var i=0;i<candidatosColor.length;i++){
            barras.datasets[0].bars[i].fillColor = "rgb("+candidatosColor[i]+")"; 
        }
        barras.update();	
    }
    function ClearSelect(clr){
        if (clr > 0 && clr <5){
            clearData();
            actualizar.hide();
            if (clr<=4) {
                zona = null;
                selectZona.hide();
                selectZona.empty();
                if (clr<=3) {
                    distrito = null;
                    selectDistrito.hide();
                    selectDistrito.empty();
                    if (clr<=2) {
                        departamento = null;
                        selectDepartamento.hide();
                        selectDepartamento.empty();
                        if (clr<=1) {
                            candidatura = null;
                            nivCandidatura = null;
                            selectCandidatura.hide();
                            selectCandidatura.empty();
                        }
                    }
                }
            }
        }
    }
    function LoadElecciones() {
        selectEleccion.append(new Option ("Seleccione una Eleccion",""));
        for (eleccion in jsonElecciones){
            selectEleccion.append(new Option (jsonElecciones[eleccion],eleccion));
        }
        /*$("#select-eleccion option[value='42']").attr("selected","selected");
        eleccionChanged();*/
    }
    function eleccionChanged(){
        eleccion = selectEleccion.val();
        ClearSelect(1);
        if (eleccion !== null && typeof eleccion != undefined && eleccion != "") {
            selectCandidatura.show();
            LoadCandidaturas();
        }else{
            eleccion = null;
        }
    }
    function LoadCandidaturas() {
        selectCandidatura.append(new Option("Seleccione un Cargo",""));
        for (candidatura in jsonCandidaturas[eleccion]){
            selectCandidatura.append(new Option (jsonCandidaturas[eleccion][candidatura]["DESCANDIDATURA"],candidatura));
        }
        $("#select-candidatura option[value='1']").attr("selected","selected");
        candidaturaChanged();
    }
    function candidaturaChanged(){
        candidatura = selectCandidatura.val();
        nivCandidatura = jsonCandidaturas[eleccion][candidatura]["NIVCANDIDATURA"];
        ClearSelect(2);
        if(candidatura !== null && candidatura != undefined && candidatura != ""){
            if(nivCandidatura == 0){
                buscarDatos();
            }else{
                selectDepartamento.show();
                LoadDepartamentos();
            } 
        }else{
            candidatura = null;  
        }
    }
    function LoadDepartamentos() {
        selectDepartamento.append(new Option ("Seleccione un Departamento",""));
        for (departamento in jsonDepartamentos[eleccion][candidatura]){
            selectDepartamento.append(new Option (jsonDepartamentos[eleccion][candidatura][departamento],departamento));
        }
        $("#select-departamento option[value='0']").attr("selected","selected");
        departamentoChanged();
    }
    function departamentoChanged(){
        departamento = selectDepartamento.val();
        ClearSelect(3);
        if(departamento !== null && departamento != undefined && departamento != ""){
            if(nivCandidatura == 1){
                buscarDatos();
            }else{
                selectDistrito.show();
                LoadDistritos();
            } 
        }else{
            departamento = null;       
        }
    }
    function LoadDistritos() {
        selectDistrito.append(new Option ("Seleccione un Distrito",""));
        for (distrito in jsonDistritos[eleccion][candidatura][departamento]){
            selectDistrito.append(new Option (jsonDistritos[eleccion][candidatura][departamento][distrito],distrito));
        }
        $("#select-distrito option[value='0']").attr("selected","selected");
        distritoChanged();
    }
    function distritoChanged() {
        distrito = selectDistrito.val();
        ClearSelect(4);
        if(distrito !== null && distrito != undefined && distrito != ""){
            if(nivCandidatura == 2){
                buscarDatos();
            }else{
                selectZona.show();
                LoadZona();
            } 
        }else{
            distrito = null;       
        }
    }
    function LoadZona() {
        selectZona.append(new Option ("Seleccione una Zona",""));
        for (zona in jsonZonas[eleccion][candidatura][departamento][distrito]){
            selectZona.append(new Option (jsonZonas[eleccion][candidatura][departamento][distrito][zona],zona));
        }
    }
    function zonaChanged() {
        zona = selectZona.val();
        clearInterval(timer);
        if(zona !== null && zona != undefined && zona != ""){
            buscarDatos();
        }else{
            zona = null;       
        }
    }
    function buscarDatos(){
        actualizar.show();
        var parameters = {
            "codeleccion":eleccion,
            "candidatura":candidatura,
        }
        if (departamento !== null) parameters.departamento = departamento;
        if (distrito !== null) parameters.distrito = distrito;
        if (zona !== null) parameters.zona = zona;
        $.getJSON("dinamics/divulgacion.ajax.php", parameters, function (data) {
            if (data) {
                data.candidatura = jsonCandidaturas[eleccion][candidatura]["DESCANDIDATURA"];
                data.tipcandidatura = jsonCandidaturas[eleccion][candidatura]["TIPCANDIDATURA"];
                data.coddepartamento = ("00" + departamento).substr(-2,2)
                data.eleccion = "18 de Diciembre del 2022";
                render(data, resultadosDiv, templateResultados);
                drawBarras(data);
            }else{
            }
        });
    }
    LoadElecciones();
    selectEleccion.on("change",eleccionChanged);
    selectCandidatura.on("change",candidaturaChanged);
    selectDepartamento.on("change", departamentoChanged);
    selectDistrito.on("change", distritoChanged);
    selectZona.on("change", zonaChanged);
    actualizar.on("click", buscarDatos);
}