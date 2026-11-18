public class AccountContactDeleteHandler { 
    public static void getdata(List<Account> data){
        for(Account acc : data){  
            Id accountId = acc.Id;          
        List<Contact> contacts = [ 
        SELECT Id,Email
        FROM Contact 
        WhERE AccountId = :accountId
        ];
        if(contacts.size()>0){
            acc.addError('Connot be deleted is Account Contact was conneted'); 
        }
        }
    }
    
}