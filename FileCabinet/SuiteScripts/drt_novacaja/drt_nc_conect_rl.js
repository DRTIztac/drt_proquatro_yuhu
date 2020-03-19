/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['./drt_cn_lib.js','N/search'], function(drt_cn_lib,search) {

    /*
    customrecord_drt_nc_conect
    Context                         custrecord_drt_nc_c_context
 	HTTP                            custrecord_drt_nc_c_http
 	Procesando                      custrecord_drt_nc_c_procesando
 	Terminado                       custrecord_drt_nc_c_terminado
 	Respuesta                       custrecord_drt_nc_c_respuesta
 	Resultado                       custrecord_drt_nc_c_resultado
 	Error                           custrecord_drt_nc_c_error
 	Transacción en Netsuite         custrecord_drt_nc_c_transaccion
 	Entidad en Netsuite             custrecord_drt_nc_c_entity
    */
    function _get(context) {
        try {
            log.audit({title:'context _get',details:context});
            var respuesta={
                success:false,
                data:{},
                record:'',
                error:{}
            };
            switch (context.data) {
                case "item": 
                var articulos = drt_cn_lib.loadsearch("customsearch_drt_nc_send_items",["displayname","averagecost", "upccode","salesdescription","category","class","taxschedule","saleunit","custitem_drt_nc_unidades_medida","custitem_drt_nc_clave_producto","baseprice"]);
                if(articulos.success){
                    respuesta.data[context.data] = articulos.data;
                }
                break;
                case "discount":
                    var descuento = drt_cn_lib.loadsearch("customsearch_drt_nc_send_discount",["name","baseprice" ]);
                if(descuento.success){
                    respuesta.data[context.data] = descuento.data;
                }
                break;
                case "customer": 
                var cliente = drt_cn_lib.loadsearch("customsearch_drt_nc_send_customer",[ "firstname", "lastname","companyname","isperson","email","custentity_mx_rfc","custentity_drt_nc_mx_cfdi_usage","custentity_drt_nc_desglose_ieps","balance","overduebalance" ]);
                if(cliente.success){
                    for(var registro in cliente.data){
                        cliente.data[registro].isperson = cliente.data[registro].isperson != '';
                        cliente.data[registro].custentity_drt_nc_desglose_ieps = cliente.data[registro].custentity_drt_nc_desglose_ieps != '';
                        cliente.data[registro].balance = parseFloat(cliente.data[registro].balance)||0;
                        cliente.data[registro].overduebalance = parseFloat(cliente.data[registro].overduebalance)||0;
                        cliente.data[registro].credito_dosponible = cliente.data[registro].overduebalance - cliente.data[registro].balance;
                    }
                    respuesta.data[context.data] =cliente.data;
                }
                
                break;
                case "taxcode":
                    var Codigodeimpuesto = drt_cn_lib.loadsearch("customsearch_drt_nc_send_taxcode",["name","rate" ]);
                if(Codigodeimpuesto.success){
                    respuesta.data[context.data] = Codigodeimpuesto.data;
                }
                
                break;
                case "location":
                    var ubicaciones = drt_cn_lib.loadsearch("customsearch_drt_nc_send_location",[ "name" ]);
                if(ubicaciones.success){
                    respuesta.data[context.data] = ubicaciones.data;
                }
                break;
                case "metodo_pago": 
                var articulos = drt_cn_lib.searchRecord(
                    'customrecord_mx_sat_payment_term',
                [
                    ['isinactive', search.Operator.IS, 'F']
                ],[
                        {name:'name'},
                        { name: 'custrecord_mx_sat_pt_code' },
                ]
                );

                if(articulos.success){
                    respuesta.data[context.data] = articulos.data;
                }
                break;
                 case "forma_pago": 
                var articulos = drt_cn_lib.searchRecord(
                    'customrecord_mx_sat_payment_string_type',
                [
                    ['isinactive', search.Operator.IS, 'F']
                ],[
                        {name:'name'},
                        { name: 'custrecord_mx_code' },
                ]
                );

                if(articulos.success){
                    respuesta.data[context.data] = articulos.data;
                }
                break;
                case "uso_cfdi": 
                var articulos = drt_cn_lib.searchRecord(
                    'customrecord_mx_sat_cfdi_usage',
                [
                    ['isinactive', search.Operator.IS, 'F']
                ],[
                        {name:'name'},
                        { name: 'custrecord_mx_sat_cfdi_code' }
                ]
                );

                if(articulos.success){
                    respuesta.data[context.data] = articulos.data;
                }
                break;
                    
            
                default:
                    break;
            }

            respuesta.success=Object.keys(respuesta.data).length>0;
        }catch (error) {
            log.audit({title:'error',details:error});
            respuesta.error=error;
            if(respuesta.record) {
                drt_cn_lib.submitRecord('customrecord_drt_nc_conect', respuesta.record, {custrecord_drt_nc_c_error: JSON.stringify(error)});
            }
        }finally {
            log.audit({title:'respuesta',details:respuesta});
            if(respuesta.record){
                drt_cn_lib.submitRecord('customrecord_drt_nc_conect',respuesta.record,{custrecord_drt_nc_c_respuesta:JSON.stringify(respuesta)})
            }
            return respuesta;
        }
    }

    function _post(context) {
        try {
            log.audit({title:'context _post',details:context});
            var respuesta={
                success:false,
                data:{},
                record:'',
                error:{}
            };
            var recordLog=drt_cn_lib.createRecord('customrecord_drt_nc_conect',{custrecord_drt_nc_c_context:JSON.stringify(context),custrecord_drt_nc_c_http:'POST'});
            if(recordLog.success){
                respuesta.data=recordLog.data;
                respuesta.record=recordLog.data;

            }
            respuesta.success=respuesta.record!='';


        }catch (error) {
            log.audit({title:'error',details:error});
            respuesta.error=error;
            if(respuesta.record) {
                drt_cn_lib.submitRecord('customrecord_drt_nc_conect', respuesta.record, {custrecord_drt_nc_c_error: JSON.stringify(error)});
            }
        }finally {
            log.audit({title:'respuesta',details:respuesta});
            if(respuesta.record){
                drt_cn_lib.submitRecord('customrecord_drt_nc_conect',respuesta.record,{custrecord_drt_nc_c_respuesta:JSON.stringify(respuesta)})
            }
            return respuesta;
        }
    }


    return {
        get: _get,
        post: _post,
    }
});
