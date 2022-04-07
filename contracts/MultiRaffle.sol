// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

/// ============ Imports ============

import "./interfaces/IERC20.sol"; // ERC20 minified interface
import "@openzeppelin/contracts/access/Ownable.sol"; // OZ: Ownership
import "@openzeppelin/contracts/token/ERC721/ERC721.sol"; // OZ: ERC721
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol"; // Chainlink VRF

/// @title MultiRaffle / Sorte Multiple
/// @author Anish Agnihotri
/// @notice Multi-winner ERC721 distribution (randomized raffle & metadata)
/// @notice Distribución ERC721 de múltiples ganadores (sorteo aleatorio y metadatos)
contract MultiRaffle is Ownable, ERC721, VRFConsumerBase {

    /// ============ Structs ============

    /// @notice Metadata for range of tokenIds
    /// @notice Metadatos para el rango de tokenIds

    struct Metadata {
        // Starting index (inclusive)
        // Indice inicial (Incluyendo)
        uint256 startIndex;

        // Ending index (exclusive)
        // Indice Final (excluyente)
        uint256 endIndex;

        // Randomness for range of tokens
        // Aleatoriedad para el rango de tokens
        uint256 entropy;
    }

    /// =========================================
    /// ============ Immutable storage ============

    /// @notice LINK token
    IERC20 public immutable LINK_TOKEN;

    /// @dev Chainlink key hash
    /// @dev Hash de clave de enlace de cadena
    bytes32 internal immutable KEY_HASH;
    
    /// @notice Cost to mint each NFT (in wei)    
    /// @notice Costo de acuñar cada NFT (en wei)
    uint256 public immutable MINT_COST;

    /// @notice Start time for raffle    
    /// @notice Hora de inicio del sorteo
    uint256 public immutable RAFFLE_START_TIME;
    
    /// @notice End time for raffle    
    /// @notice Hora final del sorteo
    uint256 public immutable RAFFLE_END_TIME;

    /// @notice Available NFT supply
    /// @notice Suministro NFT disponible
    uint256 public immutable AVAILABLE_SUPPLY;

    /// @notice Maximum mints per address    
    /// @notice Cantidad máxima de mentas por dirección
    uint256 public immutable MAX_PER_ADDRESS;


    
    /// =========================================
    /// ============ Mutable storage ============

    /// @notice Entropy from Chainlink VRF    
    /// @notice Entropía de Chainlink VRF
    uint256 public entropy;
    
    /// @notice Number of NFTs minted
    /// @notice Número de NFT acuñados
    uint256 public nftCount = 0;

    /// @notice Number of raffle entries that have been shuffled
    /// @notice Número de entradas del sorteo que se han barajado
    uint256 public shuffledCount = 0;

    /// @notice Number of NFTs w/ metadata revealed
    /// @notice Número de NFT con metadatos revelados
    uint256 public nftRevealedCount = 0;

    /// @notice Array of NFT metadata    
    /// @notice Matriz de metadatos NFT
    Metadata[] public metadatas;

    /// @notice Chainlink entropy collected for clearing
    /// @notice Entropía de Chainlink recolectada para borrar
    bool public clearingEntropySet = false;

    /// @notice Owner has claimed raffle proceeds
    /// @notice El propietario ha reclamado los ingresos de la rifa
    bool public proceedsClaimed = false;
    
    /// @notice Array of raffle entries
    /// @notice Matriz de entradas del sorteo
    address[] public raffleEntries;
    
    /// @notice Address to number of raffle entries
    /// @notice Dirección para el número de participaciones en el sorteo
    mapping(address => uint256) public entriesPerAddress;
    
    /// @notice Ticket to raffle claim status
    /// @notice Ticket para el estado de reclamo de rifa
    mapping(uint256 => bool) public ticketClaimed;



    /// =========================================
    /// ============ Events ============

    /// @notice Emitted after a successful raffle entry
    /// @notice Emitido después de una participación exitosa en la rifa
    /// @param user Address of raffle participant
    /// @param user Address del participante del sorteo

    /// @param entries Number of entries from participant
    /// @param entries Número de entradas del participante

    event RaffleEntered(address indexed user, uint256 entries);

    /// @notice Emitted after a successful partial or full shuffle
    /// @param user Address of shuffler
    /// @param numShuffled Number of entries shuffled
    event RaffleShuffled(address indexed user, uint256 numShuffled);

    /// @notice Emitted after owner claims raffle proceeds
    /// @param owner Address of owner
    /// @param amount Amount of proceeds claimed by owner
    event RaffleProceedsClaimed(address indexed owner, uint256 amount);

    /// @notice Emitted after user claims winning and/or losing raffle tickets
    /// @param user Address of claimer
    /// @param winningTickets Number of NFTs minted
    /// @param losingTickets Number of losing raffle tickets refunded
    event RaffleClaimed(address indexed user, uint256 winningTickets, uint256 losingTickets);

    /// ============ Constructor ============

    /// @notice Creates a new NFT distribution contract
    /// @param _NFT_NAME name of NFT
    /// @param _NFT_SYMBOL symbol of NFT
    /// @param _LINK_KEY_HASH key hash for LINK VRF oracle / clave hash para LINK VRF oráculo
    /// @param _LINK_ADDRESS address to LINK token / address del token LINK
    /// @param _LINK_VRF_COORDINATOR_ADDRESS address to LINK VRF Coordinator /address del coordinador de LINK VRF 
    /// @param _MINT_COST in wei per NFT
    /// @param _RAFFLE_START_TIME in seconds to begin raffle
    /// @param _RAFFLE_END_TIME in seconds to end raffle
    /// @param _AVAILABLE_SUPPLY total NFTs to sell
    /// @param _MAX_PER_ADDRESS maximum mints allowed per address
    constructor(
        string memory _NFT_NAME,
        string memory _NFT_SYMBOL,
        bytes32 _LINK_KEY_HASH,
        address _LINK_ADDRESS,
        address _LINK_VRF_COORDINATOR_ADDRESS,
        uint256 _MINT_COST,
        uint256 _RAFFLE_START_TIME,
        uint256 _RAFFLE_END_TIME,
        uint256 _AVAILABLE_SUPPLY,
        uint256 _MAX_PER_ADDRESS
    ) 
        VRFConsumerBase(
            _LINK_VRF_COORDINATOR_ADDRESS,
            _LINK_ADDRESS
        )
        ERC721(_NFT_NAME, _NFT_SYMBOL)
    {
        LINK_TOKEN = IERC20(_LINK_ADDRESS);
        KEY_HASH = _LINK_KEY_HASH;
        MINT_COST = _MINT_COST;
        RAFFLE_START_TIME = _RAFFLE_START_TIME;
        RAFFLE_END_TIME = _RAFFLE_END_TIME;
        AVAILABLE_SUPPLY = _AVAILABLE_SUPPLY;
        MAX_PER_ADDRESS = _MAX_PER_ADDRESS;
    }

    /// ===================================
    /// ============ Functions ============

    /// @notice Enters raffle with numTickets entries / Ingresa a la rifa con numTickets entradas
 
    /// @param numTickets Number of raffle entries / Número de participaciones en el sorteo
    function enterRaffle(uint256 numTickets) external payable {
        
        // Ensure raffle is active
        // Asegúrese de que la rifa esté activa
        require(block.timestamp >= RAFFLE_START_TIME, "Raffle not active");
        
        // Ensure raffle has not ended
        // Asegúrese de que la rifa no haya terminado
        require(block.timestamp <= RAFFLE_END_TIME, "Raffle ended");
        
        // Ensure number of tickets to acquire <= max per address
        // Asegúrese de que la cantidad de boletos para adquirir <= max por dirección
        require(
            entriesPerAddress[msg.sender] + numTickets <= MAX_PER_ADDRESS, 
            "Max mints for address reached"
        );

        // Ensure sufficient raffle ticket payment
        // Asegurar suficiente pago de boletos de rifa
        require(msg.value == numTickets * MINT_COST, "Incorrect payment");

        // Increase mintsPerAddress to account for new raffle entries
        // Aumentar mintsPerAddress para tener en cuenta las nuevas entradas de rifas
        entriesPerAddress[msg.sender] += numTickets;

        // Add entries to array of raffle entries
        // Agregar entradas a la matriz de entradas de la rifa
        for (uint256 i = 0; i < numTickets; i++) {
            raffleEntries.push(msg.sender);
        }

        // Emit successful entry
        emit RaffleEntered(msg.sender, numTickets);
    }

    /// @notice Allows partially or fully clearing a raffle (if needed)
    /// @notice Permite borrar parcial o totalmente una rifa (si es necesario)

    /// @param numShuffles Number of indices to shuffle (max = remaining)
    /// @param numShuffles Número de índices para barajar (máx. = restantes)
    function clearRaffle(uint256 numShuffles) external {
        // Ensure raffle has ended
        // Asegurarse de que la rifa ha terminado
        require(block.timestamp > RAFFLE_END_TIME, "Raffle has not ended");

        // Ensure raffle requires clearing (entries !< supply)
        // Asegúrese de que la rifa requiera compensación (entradas! <suministro)
        require(raffleEntries.length > AVAILABLE_SUPPLY, "Raffle does not need clearing");

        // Ensure raffle requires clearing (already cleared)
        // Asegúrese de que la rifa requiera liquidación (ya liquidada)
        require(shuffledCount != AVAILABLE_SUPPLY, "Raffle has already been cleared");

        // Ensure number to shuffle <= required number of shuffles
        // Asegurar número para barajar <= número requerido de barajas
        require(numShuffles <= AVAILABLE_SUPPLY - shuffledCount, "Excess indices to shuffle");

        // Ensure clearing entropy for shuffle randomness is set
        // Asegúrese de que la entropía de limpieza para la aleatoriedad aleatoria esté configurada
        require(clearingEntropySet, "No entropy to clear raffle");

        // Run Fisher-Yates shuffle for AVAILABLE_SUPPLY
        // Ejecutar la reproducción aleatoria de Fisher-Yates para AVAILABLE_SUPPLY
        for (uint256 i = shuffledCount; i < shuffledCount + numShuffles; i++) {
            // Generate a random index to select from
            // Generar un índice aleatorio para seleccionar
            uint256 randomIndex = i + entropy % (raffleEntries.length - i);

            // Collect the value at that random index
            // Recoge el valor en ese índice aleatorio
            address randomTmp = raffleEntries[randomIndex];

            // Update the value at the random index to the current value
            // Actualizar el valor en el índice aleatorio al valor actual
            raffleEntries[randomIndex] = raffleEntries[i];

            // Update the current value to the value at the random index
            // Actualizar el valor actual al valor en el índice aleatorio
            raffleEntries[i] = randomTmp;
        }

        // Update number of shuffled entries
        shuffledCount += numShuffles;

        // Emit successful shuffle
        emit RaffleShuffled(msg.sender, numShuffles);
    }



    /// @notice Allows user to mint NFTs for winning tickets or claim refund for losing tickets
    /// @notice Permite al usuario acuñar NFT para boletos ganadores o reclamar un reembolso por boletos perdidos
    /// @param tickets indices of all raffle tickets owned by caller
    /// @param tickets índices de todos los boletos de rifa propiedad de la persona que llama
    function claimRaffle(uint256[] calldata tickets) external {
        // Ensure raffle has ended
        // Asegúrese de que la rifa haya terminado
        require(block.timestamp > RAFFLE_END_TIME, "Raffle has not ended");
        // Ensure raffle has been cleared
        // Asegúrese de que la rifa se haya liquidado
        require(
            // Either no shuffling required
            // No se requiere barajar
            (raffleEntries.length < AVAILABLE_SUPPLY)
            // Or, shuffling completed
            // O, mezcla completada
            || (shuffledCount == AVAILABLE_SUPPLY),
            "Raffle has not been cleared"
        );

        // Mint NFTs to winning tickets
        // Mint NFT para boletos ganadores
        uint256 tmpCount = nftCount;
        for (uint256 i = 0; i < tickets.length; i++) {
            // Ensure ticket is in range
            // Asegurarse de que el ticket esté dentro del rango
            require(tickets[i] < raffleEntries.length, "Ticket is out of entries range");
            
            // Ensure ticket has not already been claimed
            // Asegúrese de que el boleto aún no haya sido reclamado
            require(!ticketClaimed[tickets[i]], "Ticket already claimed");
            
            // Ensure ticket is owned by caller
            // Asegúrese de que el boleto sea propiedad de la persona que llama
            require(raffleEntries[tickets[i]] == msg.sender, "Ticket owner mismatch");

            // Toggle ticket claim status
            // Alternar estado de reclamo de boleto
            ticketClaimed[tickets[i]] = true;

            // If ticket is a winner
            // si la boleta es ganadora 
            if (tickets[i] + 1 <= AVAILABLE_SUPPLY) {
                
                // Mint NFT to caller
                // Mint NFT a la persona que llama
                _safeMint(msg.sender, nftCount + 1);
                
                // Increment number of minted NFTs
                // Incrementar el número de NFT acuñados
                nftCount++;
            }
        }
        // Calculate number of winning tickets from newly minted
        // Calcular el número de boletos ganadores de recién acuñados
        uint256 winningTickets = nftCount - tmpCount;

        // Refund losing tickets
        // Reembolso de boletos perdidos
        if (winningTickets != tickets.length) {
            // Payout value equal to number of bought tickets - paid for winning tickets
            // Valor de pago igual al número de boletos comprados - pagado por boletos ganadores
            (bool sent, ) = payable(msg.sender).call{
                value: (tickets.length - winningTickets) * MINT_COST
            }("");
            require(sent, "Unsuccessful in refund");
        }

        // Emit claim event
        emit RaffleClaimed(msg.sender, winningTickets, tickets.length - winningTickets);
    }

    /// @notice Sets entropy for clearing via shuffle
    /// @notice Establece la entropía para la limpieza a través de la reproducción aleatoria
    function setClearingEntropy() external returns (bytes32 requestId) {
        // Ensure raffle has ended
        // Asegurarse de que la rifa ha terminado
        require(block.timestamp > RAFFLE_END_TIME, "Raffle still active");

        // Ensure contract has sufficient LINK balance
        // Asegúrese de que el contrato tenga suficiente saldo de LINK
        require(LINK_TOKEN.balanceOf(address(this)) >= 2e18, "Insufficient LINK");

        // Ensure raffle requires entropy (entries !< supply)
        // Asegúrese de que la rifa requiera entropía (entradas! <suministro)
        require(raffleEntries.length > AVAILABLE_SUPPLY, "Raffle does not need entropy");
        
        // Ensure raffle requires entropy (entropy not already set)
        // Asegúrese de que la rifa requiera entropía (la entropía aún no está configurada)
        require(!clearingEntropySet, "Clearing entropy already set");

        // Request randomness from Chainlink VRF
        // Solicitar aleatoriedad de Chainlink VRF
        return requestRandomness(KEY_HASH, 2e18);
    }

    /// @notice Reveals metadata for all NFTs with reveals pending (batch reveal)
    /// @notice Revela metadatos para todos los NFT con revelaciones pendientes (revelación por lotes)
    function revealPendingMetadata() external returns (bytes32 requestId) {
        // Ensure raffle has ended / Asegurarse de que la rifa ha terminado
        // Ensure at least 1 NFT has been minted / Asegúrese de que se haya acuñado al menos 1 NFT
        // Ensure at least 1 minted NFT requires metadata / Asegurar que al menos 1 NFT acuñado requiera metadatos
        require(nftCount - nftRevealedCount > 0, "No NFTs pending metadata reveal");
        
        // Ensure contract has sufficient LINK balance
        // Asegúrese de que el contrato tenga suficiente saldo de LINK
        require(LINK_TOKEN.balanceOf(address(this)) >= 2e18, "Insufficient LINK");

        // Request randomness from Chainlink VRF
        // Solicitar aleatoriedad de Chainlink VRF
        return requestRandomness(KEY_HASH, 2e18);
    }



    /// @notice Fulfills randomness from Chainlink VRF
    /// @notice Cumple con la aleatoriedad de Chainlink VRF

    /// @param requestId returned id of VRF request
    /// @param requestId identificación devuelta de la solicitud VRF

    /// @param randomness random number from VRF
    /// @param randomness número aleatorio de VRF
    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
        
        // If auction is cleared / Si se liquida la subasta
        // Or, if auction does not need clearing / O, si la subasta no necesita liquidación
        if (clearingEntropySet || raffleEntries.length < AVAILABLE_SUPPLY) {
            // Push new metadata (end index non-inclusive)
            // Insertar nuevos metadatos (índice final no inclusivo)
            metadatas.push(Metadata({
                startIndex: nftRevealedCount + 1,
                endIndex: nftCount + 1,
                entropy: randomness
            }));
            // Update number of revealed NFTs
            // Actualizar el número de NFT revelados
            nftRevealedCount = nftCount;
            return;
        }

        // Else, set entropy / Si no, establece la entropía
        entropy = randomness;
        // Update entropy set status / Actualizar el estado del conjunto de entropía
        clearingEntropySet = true;
    }

    /// @notice Allows contract owner to withdraw proceeds of winning tickets
    /// @notice Permite al propietario del contrato retirar los ingresos de los boletos ganadores
    function withdrawRaffleProceeds() external onlyOwner {
        // Ensure raffle has ended 
        // Asegurarse de que la rifa ha terminado 
        require(block.timestamp > RAFFLE_END_TIME, "Raffle has not ended");

        // Ensure proceeds have not already been claimed 
        // Asegurarse de que los ingresos no hayan sido reclamados ya 
        require(!proceedsClaimed, "Proceeds already claimed");

        // Toggle proceeds being claimed
        // Alternar los ingresos que se reclaman
        proceedsClaimed = true;

        // Calculate proceeds to disburse
        // Calcular los ingresos a desembolsar
        uint256 proceeds = MINT_COST * (
            raffleEntries.length > AVAILABLE_SUPPLY
                // Mint cost * available supply if many entries
                // Costo de menta * suministro disponible si hay muchas entradas
                ? AVAILABLE_SUPPLY 
                // Else, mint cost * raffle entries
                // De lo contrario, costo de menta * entradas de rifa
                : raffleEntries.length);

        // Pay owner proceeds
        // Pagar los ingresos del propietario
        (bool sent, ) = payable(msg.sender).call{value: proceeds}(""); 
        require(sent, "Unsuccessful in payout");

        // Emit successful proceeds claim
        // Emitir reclamo de ingresos exitoso
        emit RaffleProceedsClaimed(msg.sender, proceeds);
    }


    /// =====================================================
    /// ============ Developer-defined functions ============

    /// @notice Returns metadata about a token (depending on randomness reveal status)
    /// @notice Devuelve metadatos sobre un token (dependiendo del estado de revelación de aleatoriedad)

    /// @dev Partially implemented, returns only example string of randomness-dependent content
    /// @dev Implementado parcialmente, devuelve solo una cadena de ejemplo de contenido dependiente de la aleatoriedad
    function tokenURI(uint256 tokenId) override public view returns (string memory) {
        uint256 randomness;
        bool metadataCleared;
        string[3] memory parts;

        for (uint256 i = 0; i < metadatas.length; i++) {
            if (tokenId >= metadatas[i].startIndex && tokenId < metadatas[i].endIndex) {
                randomness = metadatas[i].entropy;
                metadataCleared = true;
            }
        }

        parts[0] = '<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 350 350"><style>.base { fill: white; font-family: serif; font-size: 14px; }</style><rect width="100%" height="100%" fill="black" /><text x="10" y="20" class="base">';

        if (metadataCleared) {
            parts[1] = string(abi.encodePacked('Randomness: ', _toString(randomness)));
        } else {
            parts[1] = 'No randomness assigned';
        }

        parts[2] = '</text></svg>';
        string memory output = string(abi.encodePacked(parts[0], parts[1], parts[2]));

        return output;
    }

    /// @notice Converts a uint256 to its string representation
    /// @notice Convierte un uint256 a su representación de cadena
    /// @dev Inspired by OraclizeAPI's implementation
    /// @dev Inspirado en la implementación de OraclizeAPI
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}