import { useState } from 'react';
import { Container, Row, Col, Form, Image } from "react-bootstrap";
import { Link, useNavigate } from 'react-router-dom';

import InputFlutuante from '../components/InputFlutuante';
import BotaoPrincipal from '../components/BotaoPrincipal';
import ModalSucesso from '../components/ModalSucesso';

import ImagemCadastro from '../img/signin.png';

import AlertBox from '../components/AlertBox';
import useAlert from '../hooks/useAlert';

import '../css/forms.css';
import '../css/form-pages.css';

import { formatCPF, formatAdmisionYear } from '../utils/formatter';

function Cadastro() {
    const navigate = useNavigate();

    const [showModal, setShowModal] = useState(false);

    const handleCloseModal = () => setShowModal(false);
    const handleShowModal = () => setShowModal(true);

    const { show, message, variant, alertKey, handleAlert } = useAlert();

    const [dados, setDados] = useState({
        nome: "",
        email: "",
        senha: "",
        confirmarSenha: "",
        matricula: "",
        cpf: "",
        anoIngresso: "",
        curso: "",
        semestre: ""
    });

    const handleChange = (e) => {
        setDados({ ...dados, [e.target.id]: e.target.value });
    };

    const registerUser = async () => {
        const payload = {
            nome: dados.nome,
            email: dados.email,
            senha: dados.senha,
            matricula: dados.matricula,
            cpf: dados.cpf,
            status: "ATIVO",
            bolsista: {
                anoIngresso: parseInt(dados.anoIngresso),
                curso: dados.curso
            }
        };

        const response = await fetch("http://localhost:3000/api/users", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        const { semestre } = dados;
        const dadosCadastroNovos = { semestre };

        localStorage.setItem("semestre", JSON.stringify(dadosCadastroNovos));

        if (!response.ok) {
            throw data;
        }

        return data;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (dados.senha.trim() !== dados.confirmarSenha.trim()) {
                throw new Error("As senhas devem ser iguais!");
            }

            await registerUser();
            handleShowModal();
        } catch (error) {
            if (error?.errors) {
                const message = error.errors[0];
                handleAlert(message);
            } else {
                const errorMessage = error?.error || error?.message || 'Erro ao cadastrar. Tente novamente.';
                handleAlert(errorMessage);
            }
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #00C6FF 0%, #0072FF 100%)',
            backgroundColor: '#00b0c8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <Container style={{ maxWidth: '1100px' }}>
                <Row className="align-items-center">

                    <Col lg={6} className="d-flex justify-content-center mb-5 mb-lg-0">
                        <Image
                            src={ImagemCadastro}
                            fluid
                            alt="Ilustração Cadastro"
                            style={{ width: '100%', maxWidth: '550px' }}
                        />
                    </Col>

                    <Col lg={6}>
                        <div className="bg-white px-5 py-3 shadow-lg rounded-4">
                            <Form className="w-100" onSubmit={handleSubmit}>

                                <h2 className="text-primary fw-bold mb-2" style={{ fontSize: '2.5rem' }}>Cadastre-se</h2>
                                <p className="mb-4 text-muted">
                                    Já tem cadastro? <Link to="/" className="text-decoration-none fw-bold">Faça login!</Link>
                                </p>

                                <div className="mb-3">
                                    <InputFlutuante
                                        type="text" id="nome" label="Nome Completo"
                                        value={dados.nome} onChange={handleChange}
                                    />
                                </div>

                                <div className="mb-3">
                                    <InputFlutuante
                                        type="text" id="matricula" label="Matrícula"
                                        value={dados.matricula} onChange={handleChange}
                                    />
                                </div>

                                <div className="mb-3">
                                    <InputFlutuante
                                        type="email" id="email" label="Email"
                                        value={dados.email} onChange={handleChange}
                                    />
                                </div>

                                <div className="mb-3">
                                    <InputFlutuante
                                        type="text" id="cpf" label="CPF"
                                        value={dados.cpf} onChange={e => {
                                            setDados({ ...dados, cpf: formatCPF(e.target.value) });
                                        }}
                                    />
                                </div>

                                <div className="mb-3">
                                    <div className="label-float">
                                        <Form.Control
                                            type='text'
                                            inputMode="numeric"
                                            id='anoIngresso'
                                            placeholder=" "
                                            required
                                            value={dados.anoIngresso}
                                            onChange={e => {
                                                setDados({ ...dados, anoIngresso: formatAdmisionYear(e.target.value) });
                                            }}
                                        />
                                        <label htmlFor='anoIngresso'>Ano de ingresso</label>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <Form.Select
                                        required
                                        id='semestre'
                                        className='label-float'
                                        value={dados.semestre}
                                        onChange={handleChange}
                                        style={
                                            {
                                                border: '1px solid #8C8B8B',
                                                borderRadius: '20px'
                                            }
                                        }>
                                        <option value="">Selecione o semestre</option>
                                        <option value="1">1º Semestre</option>
                                        <option value="2">2º Semestre</option>
                                    </Form.Select>
                                </div>

                                <div className="mb-3">
                                    <Form.Select
                                        required
                                        id='curso'
                                        className='label-float'
                                        value={dados.curso}
                                        onChange={handleChange}
                                        style={
                                            {
                                                border: '1px solid #8C8B8B',
                                                borderRadius: '20px'
                                            }
                                        }>
                                        <option value="">Selecione o curso</option>
                                        <option value="Ciência da Computação">Ciência da Computação</option>
                                        <option value="Engenharia Ambiental">Engenharia Ambiental</option>
                                        <option value="Engenharia Ambiental e Sanitária">
                                            Engenharia Ambiental e Sanitária
                                        </option>
                                        <option value="Engenharia Civil">Engenharia Civil</option>
                                        <option value="Engenharia de Minas">Engenharia de Minas</option>
                                        <option value="Sistemas de Informação">Sistemas de Informação</option>
                                    </Form.Select>
                                </div>

                                <div className="mb-3">
                                    <InputFlutuante
                                        type="password" id="senha" label="Senha"
                                        value={dados.senha} onChange={handleChange}
                                    />
                                </div>

                                <div className="mb-3">
                                    <InputFlutuante
                                        type="password" id="confirmarSenha" label="Confirmar sua senha"
                                        value={dados.confirmarSenha} onChange={handleChange}
                                    />
                                </div>

                                <AlertBox
                                    show={show}
                                    message={message}
                                    variant={variant}
                                    alertKey={alertKey}
                                />

                                <div className="py-2">
                                    <BotaoPrincipal texto="Cadastrar" type="submit" />
                                </div>

                            </Form>
                        </div>
                    </Col>
                </Row>
            </Container>

            <ModalSucesso
                show={showModal}
                onHide={handleCloseModal}
                title="Cadastro realizado!"
                message="Seu cadastro foi realizado com sucesso. Você já pode fazer entrar!"
                buttonText="Ir para o Login"
                onAction={() => navigate("/")}
            />
        </div>
    );
};

export default Cadastro;