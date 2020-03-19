/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search','N/record'], 
function(search,record) {

    function getInputData() {
        try{
         var respuesta = search.create({
            type: 'customrecord_drt_nc_conect',
            columns: [
                'custrecord_drt_nc_c_context',
                'custrecord_drt_nc_c_http',
                'custrecord_drt_nc_c_procesando',
                'custrecord_drt_nc_c_terminado',
                'custrecord_drt_nc_c_respuesta',
                'custrecord_drt_nc_c_resultado',
                'custrecord_drt_nc_c_error',
                'custrecord_drt_nc_c_transaccion',
                'custrecord_drt_nc_c_entity'
            ],
            filters: [ 
                ['isinactive', search.Operator.IS, 'F'], 
                'and',
                ['custrecord_drt_nc_c_procesando', search.Operator.IS, 'F'], 
                'and',
                ['custrecord_drt_nc_c_terminado', search.Operator.IS, 'F'], 
                'and',
                ['custrecord_drt_nc_c_http', search.Operator.IS, 'POST'],
                'and',
                ['custrecord_drt_nc_c_context', search.Operator.ISNOTEMPTY, null]
                
            ]
        });   
        }
        catch ( error ) {
            log.error({ title:'error getInputData',details:JSON.stringify( error ) }); 
        }
        finally{
            return respuesta; 
        }
        
    }

    function map(context) { 
        try {
            log.audit({title:' context map ',details:JSON.stringify( context )});
            var objvalue = JSON.parse( context.value )
           
            record.submitFields({
                type: objvalue.recordType,
                id: objvalue.id, 
                values: {
                    custrecord_drt_nc_c_procesando: true
                },
                options: {
                    enableSourcing: true,
                    ignoreMandatoryFields : true
                }
            });
            
            
        } catch (error) {
            log.error({ title:'error map',details:JSON.stringify( error ) });
            
        }
        finally{
            context.write({
                key: objvalue.id,
                value: objvalue
            });
        }
        
    }

    function reduce(context) {
        try {
            var recordData = context.values;
            for (var ids in recordData) {
                try {
                    var objupdate ={
                        custrecord_drt_nc_c_procesando: false
                        
                    };
                    log.audit({title:' context reduce',details:JSON.stringify( context )});
                    var data = JSON.parse(recordData[ids]);
                    log.emergency({title:'data',details:JSON.stringify(data)});
                    log.audit({title:'data.recordType',details:JSON.stringify(data.recordType)});
                    log.audit({title:'data.id',details:JSON.stringify(data.id)});
                    var parametro =  JSON.parse(data.values.custrecord_drt_nc_c_context);
                    if (parametro.recordType=="invoice"){
                        if(!parametro.entity && data.values.custrecord_drt_nc_c_entity.value){
                            parametro.entity = data.values.custrecord_drt_nc_c_entity.value;
                        }
                        if( !parametro.entity ){
                            var objentity = record.create({
                                type: record.Type.CUSTOMER, 
                                isDynamic: true,
                            });
                            if( parametro.customer.isperson ){ 
                                objentity.setValue( { 
                                    fieldId:"isperson", 
                                    value: "T"
                                 } );
                        
                                objentity.setValue( { 
                                    fieldId:"firstname", 
                                    value: parametro.customer.firstname
                                 } );
                                 objentity.setValue( { 
                                    fieldId:"lastname", 
                                    value: parametro.customer.lastname
                                 } );
                            }
                            else{
                                objentity.setValue( { 
                                    fieldId:"isperson", 
                                    value: "F"
                                 } );
                                objentity.setValue( { 
                                    fieldId:"companyname", 
                                    value: parametro.customer.companyname
                                 } );
                            }
                            if( parametro.customer.email){
                                objentity.setValue({
                                    fieldId: 'email',
                                    value: parametro.customer.email,
                                });
                            }
                            if( parametro.customer.custentity_mx_rfc){
                                objentity.setValue({
                                    fieldId: 'custentity_mx_rfc',
                                    value: parametro.customer.custentity_mx_rfc,
                                });
                            }
                            if( parametro.customer.custentity_drt_nc_mx_cfdi_usage){
                                objentity.setValue({
                                    fieldId: 'custentity_drt_nc_mx_cfdi_usage',
                                    value: parametro.customer.custentity_drt_nc_mx_cfdi_usage,
                                });
                            }

                            parametro.entity = objentity.save({
                                enableSourcing: false,
                                ignoreMandatoryFields: true 
                            })||"";
                            log.audit({title:'parametro.entity',details:JSON.stringify(parametro.entity)});
                            if(parametro.entity){
                                objupdate.custrecord_drt_nc_c_entity = parametro.entity;
                            }
                                
                          

                        }
                        var objRecord = record.create({
                            type: record.Type.INVOICE, 
                            isDynamic: true,
                            defaultValues: {
                                entity: parametro.entity
                            } 
                        });
                        if( parametro.location){
                            try {
                                var fieldLookUp = search.lookupFields({
                                    type: search.Type.LOCATION,
                                    id: parametro.location,
                                    columns: ['subsidiary']
                                })||{subsidiary:""};
                                
                            } catch (errorsubsidiary) {
                                log.audit({title:'errorsubsidiary',details:JSON.stringify(errorsubsidiary)});
                                fieldLookUp = {"subsidiary":''};
                                
                            }
                            log.audit({title:'fieldLookUp',details:JSON.stringify(fieldLookUp)});
                            if( fieldLookUp.subsidiary){
                                objRecord.setValue({
                                    fieldId: 'subsidiary',
                                    value: fieldLookUp.subsidiary,
                                });
                            }
                            objRecord.setValue({
                                fieldId: 'location',
                                value: parametro.location,
                            });
                        }
                        if( parametro.custbody_mx_txn_sat_payment_term){
                            objRecord.setValue({
                                fieldId: 'custbody_mx_txn_sat_payment_term',
                                value: parametro.custbody_mx_txn_sat_payment_term,
                            });
                        }
                        if( parametro.custbody_mx_txn_sat_payment_method){
                            objRecord.setValue({
                                fieldId: 'custbody_mx_txn_sat_payment_method',
                                value: parametro.custbody_mx_txn_sat_payment_method,
                            });
                        }
                        if( parametro.custbody_drt_nc_requiere_factura){
                            objRecord.setValue({
                                fieldId: 'custbody_drt_nc_requiere_factura',
                                value: parametro.custbody_drt_nc_requiere_factura,
                            });
                        }
                        if( parametro.custbody_mx_cfdi_usage){
                            objRecord.setValue({
                                fieldId: 'custbody_mx_cfdi_usage',
                                value: parametro.custbody_mx_cfdi_usage,
                            });
                        }
                        if( parametro.custbody_mx_cfdi_uuid){
                            objRecord.setValue({
                                fieldId: 'custbody_mx_cfdi_uuid',
                                value: parametro.custbody_mx_cfdi_uuid,
                            });
                        }
                        if( parametro.custbody_psg_ei_certified_edoc){
                            objRecord.setValue({
                                fieldId: 'custbody_psg_ei_certified_edoc',
                                value: parametro.custbody_psg_ei_certified_edoc,
                            });
                        }
                        if( parametro.custbody_edoc_generated_pdf){
                            objRecord.setValue({
                                fieldId: 'custbody_edoc_generated_pdf',
                                value: parametro.custbody_edoc_generated_pdf,
                            });
                        }
                        for( var liena in parametro.item){
                            objRecord.selectNewLine({
                                sublistId: 'item'
                            });
                            if(parametro.item[ liena ].id){
                                objRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    value: parametro.item[ liena ].id
                                });
                            }
                            if(parametro.item[ liena ].price){
                                objRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'price',
                                    value: parametro.item[ liena ].price
                                });
                            }
                            // if(parametro.item[ liena ].units){
                            //     objRecord.setCurrentSublistValue({
                            //             sublistId: 'item',
                            //             fieldId: 'units',
                            //             value: parametro.item[ liena ].units
                            //     });
                            // }
                            if(parametro.item[ liena ].rate){
                                objRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'rate',
                                    value: parametro.item[ liena ].rate
                                });
                            }
                            if(parametro.item[ liena ].quantity){
                                objRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'quantity',
                                    value: parametro.item[ liena ].quantity
                                });
                            }
                            if(parametro.item[ liena ].taxcode){
                                objRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'taxcode',
                                    value: parametro.item[ liena ].taxcode
                                });
                            }
                            // if(parametro.item[ liena ].custcol_mx_txn_line_sat_item_code){
                            //     objRecord.setCurrentSublistValue({
                            //             sublistId: 'item',
                            //             fieldId: 'custcol_mx_txn_line_sat_item_code',
                            //             value: parseInt(parametro.item[ liena ].custcol_mx_txn_line_sat_item_code)
                            //     });
                            // }
                            if(parametro.item[ liena ].unidad_medida_sat){
                                objRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'unidad_medida_sat',
                                    value: parametro.item[ liena ].unidad_medida_sat
                                });
                            }
                            if(parametro.item[ liena ].custcol_drt_nc_corte_acero){
                                objRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_drt_nc_corte_acero',
                                    value: parametro.item[ liena ].custcol_drt_nc_corte_acero
                                });
                            }                
                            
                            objRecord.commitLine({
                                sublistId:'item'
                            });


                            
                            if(parametro.item[ liena ].discount){
                                objRecord.selectNewLine({
                                    sublistId: 'item'
                                });
                                objRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    value: parametro.item[ liena ].discount
                                });
                                objRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'quantity',
                                    value: 1
                                });
                                objRecord.commitLine({
                                    sublistId:'item'
                                });
                            }
                        }
                            
                        var recordId = objRecord.save({
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        })||"";
                        log.audit({title:'recordId',details:JSON.stringify(recordId)});
                        if ( recordId ){
                            objupdate.custrecord_drt_nc_c_transaccion = recordId;
                        }

                    }
                

                } catch (error) {
                    log.error({ title:'error reduce',details:JSON.stringify( error ) });
                    objupdate.custrecord_drt_nc_c_error = JSON.stringify(error);
                    
                }
                finally{
                    log.audit({title:'objupdate',details:JSON.stringify(objupdate)});
                    record.submitFields({  
                        type: data.recordType,
                        id: data.id,
                        values: objupdate,
                        options: {
                            enableSourcing: true,
                            ignoreMandatoryFields : true
                        }
                    });

                }
            }
        } catch (error) {
            log.error({ title:'error reduce',details:JSON.stringify( error ) });
            objupdate.custrecord_drt_nc_c_error = JSON.stringify(error);
            
        }
        
        
        
    }

    function summarize(context) {
        try {
            log.audit({title:' context summary ',details:JSON.stringify( context )});

        log.audit({
            title: 'Usage units consumed',
            details: context.usage
        });
        log.audit({
            title: 'Concurrency',
            details: context.concurrency
        });
        log.audit({
            title: 'Number of yields',
            details: context.yields
        });

        
        var text = '';
        var totalKeysSaved = 0;
        context.output.iterator().each(function(key, value) {
            text += (key + ' ' + value + '\n');
            totalKeysSaved++;
            return true;
        });


        log.audit({
            title: 'Unique number of letters used in string',
            details: totalKeysSaved
        }); 


        } catch (error) {
            log.error({ title:'error summarize',details:JSON.stringify( error ) });  
        }
        
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});

