module recall_ai::recall_memory {
    use sui::event;
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    public struct Registry has key {
        id: UID,
        entries: vector<MemoryRef>
    }

    public struct MemoryRef has copy, drop, store {
        owner: address,
        session_id: vector<u8>,
        title: vector<u8>,
        blob_id: vector<u8>,
        updated_at_ms: u64
    }

    public struct MemoryStored has copy, drop {
        owner: address,
        session_id: vector<u8>,
        blob_id: vector<u8>,
        updated_at_ms: u64
    }

    entry fun create_registry(ctx: &mut TxContext) {
        transfer::share_object(Registry {
            id: object::new(ctx),
            entries: vector[]
        });
    }

    entry fun upsert_memory(
        registry: &mut Registry,
        session_id: vector<u8>,
        title: vector<u8>,
        blob_id: vector<u8>,
        updated_at_ms: u64,
        ctx: &mut TxContext
    ) {
        let owner = tx_context::sender(ctx);

        let mut index = 0;
        let len = vector::length(&registry.entries);
        while (index < len) {
            let existing = vector::borrow_mut(&mut registry.entries, index);
            if (existing.owner == owner && existing.session_id == session_id) {
                existing.title = title;
                existing.blob_id = blob_id;
                existing.updated_at_ms = updated_at_ms;
                event::emit(MemoryStored {
                    owner,
                    session_id,
                    blob_id,
                    updated_at_ms
                });
                return
            };
            index = index + 1;
        };

        vector::push_back(&mut registry.entries, MemoryRef {
            owner,
            session_id,
            title,
            blob_id,
            updated_at_ms
        });

        event::emit(MemoryStored {
            owner,
            session_id,
            blob_id,
            updated_at_ms
        });
    }
}
