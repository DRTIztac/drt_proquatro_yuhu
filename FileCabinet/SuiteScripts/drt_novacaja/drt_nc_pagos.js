/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
 define(['N/search', 'N/render', 'N/file', 'N/record', 'N/runtime', 'N/config', 'N/url', 'N/xml', 'N/format'],

    function(search,render) {
     
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
     function getInputData() {
        var customrecord_drt_nc_pagosSearchObj = search.create({
         type: "customrecord_drt_nc_pagos",
         filters:
         [
         ["isinactive","is","F"]
         ],
         columns:
         [
         search.createColumn({
           name: "custrecord_drt_nc_p_conexion",
           sort: search.Sort.ASC,
           label: "Conexion"
       }),
         search.createColumn({name: "custrecord_drt_nc_p_context"}),
         search.createColumn({name: "custrecord_drt_nc_p_invoice"}),
         search.createColumn({name: "externalid", label: "External ID"}),
         search.createColumn({name: "isinactive", label: "Inactive"}),
         search.createColumn({name: "internalid", label: "Internal ID"}),
         search.createColumn({name: "custrecord_drt_nc_p_transaccion", label: "Transacción"})
         ]
     });
            //var searchResultCount = customrecord_drt_nc_pagosSearchObj.runPaged().count;
            //log.debug("customrecord_drt_nc_pagosSearchObj result count",searchResultCount);
            

            return customrecord_drt_nc_pagosSearchObj;
            
        }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
     function map(context) {
        var jsonRecord=JSON.parse(context.value);
/*
 * {"recordType":"customrecord_drt_nc_pagos",
 * "id":"2",
 * "values":{"custrecord_drt_nc_p_conexion":""
 * ,"custrecord_drt_nc_p_context":"test"
 * ,"custrecord_drt_nc_p_invoice":"","externalid":"","isinactive":"F","internalid":{"value":"2","text":"2"},"custrecord_drt_nc_p_transaccion":""}}
 * */
 
 
 var record_pagos = record.load({
  id: jsonRecord.id,
  type: 'customrecord_drt_nc_pagos',
  isDynamic: true,
});
 
 
 var jsonPayment = JSON.parse(unescape(jsonRecord.values.custrecord_drt_nc_p_context));
 
 try{
    log.debug({title:'jsonPayment unescaped',details:JSON.stringify(jsonPayment)})
}catch(error){
    log.debug({title:'error',details:error})
    record_pagos.setValue({fieldId:'custrecord_drt_nc_p_error',value:error});
}

try{
    var obody_field={};
    var oPayment={}
    var arrLine= [];
    var dataCustomer= getCustomerData(jsonPayment.internalid);
    var customer = dataCustomer ;
    var invoice  = jsonPayment.internalid ;
    
    obody_field.customer       = customer;
    obody_field.paymentmethod  = 1;
    obody_field.custbody_drt_nc_tipo_pago =jsonPayment.tipo_pago;
    obody_field.custbody_drt_nc_identificador_uuid =jsonPayment.custbody_drt_nc_identificador_uuid;
    var line= {
        internalid:invoice,
        amount:jsonPayment.total
    } ;
    arrLine.push(line);
    oPayment.body_field=obody_field;
    oPayment.param_line=arrLine;    
    

    
    var oPayment=createPayment( oPayment.body_field, oPayment.param_line);
    record_pagos.setValue({fieldId:'custrecord_drt_nc_p_transaccion',value:oPayment.data});
    log.debug({title:"Payment ",details: JSON.stringify(jsonPayment)});
}catch(error){
    record_pagos.setValue({fieldId:'custrecord_drt_nc_p_error',value:error});
    
    log.emergency({title:"Error al generar payment",details: error});
} finally{
    record_pagos.save();
}


}

function createPayment( param_body, param_line) {

    const param_record= 'customerpayment';
    try {
        var respuesta = {
            success: false,
            data: '',
            error: {}
        };

        if (param_record) {
            var nuevo_registro = record.create({
                type: param_record,
                isDynamic: true
            });
            if (param_body) {
                for (var fieldId in param_body) {
                    nuevo_registro.setValue({
                        fieldId: fieldId,
                        value: param_body[fieldId]
                    });
                }
            }
            if (param_line) {

                var lineCount = nuevo_registro.getLineCount({
                    sublistId: 'apply'
                }) || 0;

                log.audit({
                    title: 'lineCount',
                    details: JSON.stringify(lineCount)
                });
                for (var invoice = 0; invoice < param_line.length; invoice++) {
                    for (var renglon = 0; renglon < lineCount; renglon++) {
                        log.audit({
                            title: 'renglon',
                            details: JSON.stringify(renglon)
                        });
                        nuevo_registro.selectLine({
                            sublistId: 'apply',
                            line: renglon
                        });
                        if (
                            nuevo_registro.getCurrentSublistValue({
                                sublistId: 'apply',
                                fieldId: 'internalid',
                            }) ==
                            param_line[invoice].internalid
                            ) {
                            nuevo_registro.setCurrentSublistValue({
                                sublistId: 'apply',
                                fieldId: 'apply',
                                value: true
                            });

                        nuevo_registro.setCurrentSublistValue({
                            sublistId: 'apply',
                            fieldId: 'amount',
                            value: param_line[invoice].amount
                        });
                    } else {
                        nuevo_registro.setCurrentSublistValue({
                            sublistId: 'apply',
                            fieldId: 'apply',
                            value: false
                        });

                    }
                }
            }
        }
        respuesta.data = nuevo_registro.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        }) || '';
    }
    respuesta.success = respuesta.data != '';
} catch (error) {
    respuesta.error = error;
    log.error({
        title: 'error createPayment',
        details: JSON.stringify(error)
    });
} finally {
    log.emergency({
        title: 'respuesta createPayment',
        details: JSON.stringify(respuesta)
    });
    return respuesta;
}

}
function getCustomerData(idInvoice){
  try{

      var record_invoice = record.load({
          id: idInvoice,
          type: 'invoice',
          isDynamic: false,
      });
      
      var customer =record_invoice.getValue({
          fieldId: 'entity'
      });
      return customer;
      
      
  }catch(error){
      return 
  }
}

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
     function reduce(context) {

     } 

    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
     function summarize(summary) {

     }

     return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
