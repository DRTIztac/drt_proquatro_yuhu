/**
 * drt_cn_lib.js
 * @NApiVersion 2.x
 * @NModuleScope public
 */

define([
        'N/log',
        'N/search',
        'N/record'
    ],
    function (
        log,
        search,
        record
    ) {

        function searchRecord(param_type,param_filters,param_column) {
            try {
                var respuesta = {
                    success: false,
                    data: {},
                    error:{}
                };
                /*
                 param_filters=[
                    ['isinactive', search.Operator.IS, 'F']
                ];
                param_column=[
                        { name: 'name' }
                ]
                 */
                if (param_type &&
                    param_filters &&
                    param_column
                ) {

                    var result = search.create({
                        type: param_type,
                        filters: param_filters,
                        columns: param_column
                    });
                    var resultData = result.run();
                    var start = 0;
                    do {
                        var resultSet = resultData.getRange(start, start + 1000);
                        if (resultSet && resultSet.length > 0) {
                            for (var i = 0; i < resultSet.length; i++) {
//                            log.audit({ title: 'resultSet[' + i + ']', details: JSON.stringify(resultSet[i]) });
                                if(!respuesta.data[resultSet[i].id]){
                                    respuesta.data[resultSet[i].id]= {
                                        id:resultSet[i].id, 
                                    };
                                    for(var column in param_column){
                                        respuesta.data[resultSet[i].id][param_column[column].name]=resultSet[i].getValue(param_column[column])||''
                                    }
                                }
                            }
                        }
                        start += 1000;
                    } while (resultSet && resultSet.length == 1000);
                }
                respuesta.success = Object.keys(respuesta.data).length >0;
            } catch (error) {
                log.error({title: 'error searchRecord', details: JSON.stringify(error)});
                respuesta.error=error;
            } finally {
                log.audit({title: 'respuesta searchRecord', details: respuesta});
                return respuesta;
            }
        }
        function createRecord(param_type,param_field_value) {
            try {
                var respuesta = {
                    success: false,
                    data: '',
                    error:{}
                };
                var newRecord=record.create({
                    type: param_type,
                    isDynamic: false
                });

                for(var field in param_field_value){
                    newRecord.setValue({
                        fieldId: field,
                        value: param_field_value[field]
                    });
                }

                respuesta.data =newRecord.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                })||'';

                respuesta.success = respuesta.data != '';
            } catch (error) {
                log.error({title: 'error createRecord', details: JSON.stringify(error)});
                respuesta.error=error;
            } finally {
                log.audit({title: 'respuesta createRecord', details: respuesta});
                return respuesta;
            }
        }

        function submitRecord(param_type,param_id,param_field_value) {
            try {
                var respuesta = {
                    success: false,
                    data: '',
                    error:{}
                };
                respuesta.data = record.submitFields({
                    type: param_type,
                    id: param_id,
                    values: param_field_value,
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });


                respuesta.success = respuesta.data != '';
            } catch (error) {
                log.error({title: 'error submitRecord', details: JSON.stringify(error)});
                respuesta.error=error;
            } finally {
                log.audit({title: 'respuesta submitRecord', details: respuesta});
                return respuesta;
            }
        }
        function loadsearch(param_idsearch, param_array_data ){
            try {
                var respuesta = {
                    success: false, 
                    data: {}
                }
                log.audit({title:'param_idsearch',details:JSON.stringify(param_idsearch)});
                log.audit({title:'param_array_data',details:JSON.stringify(param_array_data)});
                var mySearch = search.load({
                    id: param_idsearch
                });                
                for ( var fild in param_array_data){
                    mySearch.columns.push( search.createColumn ({ name: param_array_data[ fild ] }));
                }
        
                log.audit({title:'mySearch.columns',details:JSON.stringify(mySearch.columns)});
                mySearch.run().each(function(result) {
                    respuesta.data[result.id] = {
                        id: result.id||""
                    };
                    for ( var fild in param_array_data){
                        respuesta.data[result.id][ param_array_data[ fild ] ] = result.getValue({ name: param_array_data [ fild ]})|| "";
                    }
                    return true;
                });
                respuesta.success = Object.keys (respuesta.data).length >0;
            } catch (error) {
                log.audit( { title: "error loadsearch", details: error } )
            } finally{
                log.audit({title:'respuesta loadsearch',details:JSON.stringify(respuesta)}); 
                return respuesta;
            }
        }

        return {
            searchRecord:searchRecord,
            createRecord:createRecord,
            submitRecord:submitRecord,
            loadsearch:loadsearch
        }
    });