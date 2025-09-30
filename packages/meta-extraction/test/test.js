import assert from 'assert';
import { extractAbstract } from '../src/index.js';

describe.only('Abstract Extraction', function () {
  it('should extract abstract using general rule', async function () {
    this.retries(3);
    const abstractExpected = 'Unimanual interaction allows the user to operate the mobile device in a distracted, multitasking scenario and frees the other hand for tasks like carrying a bag, writing a relevant note etc. In such scenarios, the thumb of the hand holding the device is normally the only available finger for touch input [Boring et al. 2012]. However, mainly due to biomechanical limitations of the thumb, only a subregion of the touch screen is comfortable to access by the thumb [Karlson and Bederson 2007], causing awkward hand postures to reach the rest of the screen. This problem of limited screen accessibility by the thumb deteriorates with screens of increasingly bigger sizes, which, however, are getting more and more popular [Fingas 2012].';
    const {abstract} = await extractAbstract('https://doi.org/10.1145/2543651.2543680');
    assert.equal(abstract,abstractExpected);
  });

  it('should extract abstract using general rule (proceedings.mlr.press)', async function () {
    this.retries(3);
    const abstractExpected = 'In order for a robot to be a generalist that can perform a wide range of jobs, it must be able to acquire a wide variety of skills quickly and efficiently in complex unstructured environments. High-capacity models such as deep neural networks can enable a robot to represent complex skills, but learning each skill from scratch then becomes infeasible. In this work, we present a meta-imitation learning method that enables a robot to learn how to learn more efficiently, allowing it to acquire new skills from just a single demonstration. Unlike prior methods for one-shot imitation, our method can scale to raw pixel inputs and requires data from significantly fewer prior tasks for effective learning of new skills. Our experiments on both simulated and real robot platforms demonstrate the ability to learn new tasks, end-to-end, from a single visual demonstration.';
    const pdfExpected = 'http://proceedings.mlr.press/v78/finn17a/finn17a.pdf';
    const {abstract, pdf} = await extractAbstract('http://proceedings.mlr.press/v78/finn17a.html');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should extract abstract using arxiv rule', async function () {
    this.retries(3);
    const abstractExpected = 'While medical images such as computed tomography (CT) are stored in DICOM format in hospital PACS, it is still quite routine in many countries to print a film as a transferable medium for the purposes of self-storage and secondary consultation. Also, with the ubiquitousness of mobile phone cameras, it is quite common to take pictures of the CT films, which unfortunately suffer from geometric deformation and illumination variation. In this work, we study the problem of recovering a CT film, which marks the first attempt in the literature, to the best of our knowledge. We start with building a large-scale head CT film database CTFilm20K, consisting of approximately 20,000 pictures, using the widely used computer graphics software Blender. We also record all accompanying information related to the geometric deformation (such as 3D coordinate, depth, normal, and UV maps) and illumination variation (such as albedo map). Then we propose a deep framework to disentangle geometric deformation and illumination variation using the multiple maps extracted from the CT films to collaboratively guide the recovery process. Extensive experiments on simulated and real images demonstrate the superiority of our approach over the previous approaches. We plan to open source the simulated images and deep models for promoting the research on CT film recovery (https://anonymous.4open.science/r/e6b1f6e3-9b36-423f-a225-55b7d0b55523/).';
    const pdfExpected = 'http://arxiv.org/pdf/2012.09491v1';
    const {abstract,pdf} = await extractAbstract('https://arxiv.org/abs/2012.09491');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it.skip('should extract abstract using general rule (ojs.aaai.org)', async function () {
    this.retries(3);
    const abstractExpected = 'We study how political polarization is reflected in the social media posts used by media outlets to promote their content online. In particular, we track the Twitter posts of several media outlets over the course of more than three years (566K tweets), and the engagement with these tweets from other users (104M retweets), modeling the relationship between the tweet text and the political diversity of the audience. We build a tool that integrates our model and helps journalists craft tweets that are engaging to a politically diverse audience, guided by the model predictions. To test the real-world impact of the tool, we partner with the PBS documentary series Frontline and run a series of advertising experiments on Twitter. We find that in seven out of the ten experiments, the tweets selected by our model were indeed engaging to a more politically diverse audience, reducing the gap in engagement between left- and right-leaning users by 20.3%, on average, and illustrating the effectiveness of our approach.';
    const pdfExpected = 'https://ojs.aaai.org/index.php/ICWSM/article/download/19342/19114';
    const {abstract, pdf} = await extractAbstract('https://ojs.aaai.org/index.php/ICWSM/article/view/19342');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should extract abstract and pdf using aaai rule (aaai.org)', async function () {
    this.retries(3);
    const abstractExpected = 'We propose a system for the derivation of algorithms which allows us to use "factual knowledge" for the development of concurrent programs. From preliminary program versions the system can derive new versions which have higher performances and can be evaluated by communicating agents in a parallel architecture. The knowledge about the facts or properties of the programs is also used for the improvement of the system itself.';
    const pdfExpected = 'https://cdn.aaai.org/AAAI/1986/AAAI86-005.pdf';
    const {abstract, pdf} = await extractAbstract('http://www.aaai.org/Library/AAAI/1986/aaai86-005.php');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should extract pdf using aaai rule (aaai.org)', async function () {
    this.retries(3);
    const abstractExpected = null; // no abstract available on the webpage
    const pdfExpected = 'https://cdn.aaai.org/ojs/10167/10167-13-13695-1-2-20201228.pdf';
    const {abstract, pdf} = await extractAbstract('http://www.aaai.org/ocs/index.php/AAAI/AAAI16/paper/view/12177');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should extract abstract and pdf using general rule (openaccess.thecvf.com)', async function () {
    this.retries(3);
    const abstractExpected = 'Despite the great success of GANs in images translation with different conditioned inputs such as semantic segmentation and edge map, generating high-fidelity images with reference styles from exemplars remains a grand challenge in conditional image-to-image translation. This paper presents a general image translation framework that incorporates optimal transport for feature alignment between conditional inputs and style exemplars in translation. The introduction of optimal transport mitigates the constraint of many-to-one feature matching significantly while building up semantic correspondences between conditional inputs and exemplars. We design a novel unbalanced optimal transport to address the transport between features with deviational distributions which exists widely between conditional inputs and exemplars. In addition, we design a semantic-aware normalization scheme that injects style and semantic features of exemplars into the image translation process successfully. Extensive experiments over multiple image translation tasks show that our proposed technique achieves superior image translation qualitatively and quantitatively as compared with the state-of-the-art.';
    const pdfExpected = 'https://openaccess.thecvf.com/content/CVPR2021/papers/Zhan_Unbalanced_Feature_Transport_for_Exemplar-Based_Image_Translation_CVPR_2021_paper.pdf';
    const {abstract, pdf} = await extractAbstract('https://openaccess.thecvf.com/content/CVPR2021/html/Zhan_Unbalanced_Feature_Transport_for_Exemplar-Based_Image_Translation_CVPR_2021_paper.html');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should extract abstract and pdf using aclanthology rule (aclanthology.org)', async function () {
    this.retries(3);
    const abstractExpected = 'Training a Named Entity Recognition (NER) model often involves fixing a taxonomy of entity types. However, requirements evolve and we might need the NER model to recognize additional entity types. A simple approach is to re-annotate entire dataset with both existing and additional entity types and then train the model on the re-annotated dataset. However, this is an extremely laborious task. To remedy this, we propose a novel approach called Partial Label Model (PLM) that uses only partially annotated datasets. We experiment with 6 diverse datasets and show that PLM consistently performs better than most other approaches (0.5 - 2.5 F1), including in novel settings for taxonomy expansion not considered in prior work. The gap between PLM and all other approaches is especially large in settings where there is limited data available for the additional entity types (as much as 11 F1), thus suggesting a more cost effective approaches to taxonomy expansion.';
    const pdfExpected = 'https://aclanthology.org/2023.emnlp-main.426.pdf';
    const {abstract, pdf} = await extractAbstract('https://aclanthology.org/2023.emnlp-main.426');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it.skip('should extract abstract and pdf using neuripsCC rule (proceedings.neurips.cc)', async function () {
    this.retries(3);
    const abstractExpected = 'Semi-supervised learning (SSL) improves model generalization by leveraging massive unlabeled data to augment limited labeled samples. However, currently, popular SSL evaluation protocols are often constrained to computer vision (CV) tasks. In addition, previous work typically trains deep neural networks from scratch, which is time-consuming and environmentally unfriendly. To address the above issues, we construct a Unified SSL Benchmark (USB) for classification by selecting 15 diverse, challenging, and comprehensive tasks from CV, natural language processing (NLP), and audio processing (Audio), on which we systematically evaluate the dominant SSL methods, and also open-source a modular and extensible codebase for fair evaluation of these SSL methods. We further provide the pre-trained versions of the state-of-the-art neural models for CV tasks to make the cost affordable for further tuning. USB enables the evaluation of a single SSL algorithm on more tasks from multiple domains but with less cost. Specifically, on a single NVIDIA V100, only 39 GPU days are required to evaluate FixMatch on 15 tasks in USB while 335 GPU days (279 GPU days on 4 CV datasets except for ImageNet) are needed on 5 CV tasks with TorchSSL.';
    const pdfExpected = 'https://proceedings.neurips.cc/paper_files/paper/2022/file/190dd6a5735822f05646dc27decff19b-Paper-Datasets_and_Benchmarks.pdf';

    // redirect to neurips.cc
    const {abstract, pdf} = await extractAbstract('http://papers.nips.cc/paper_files/paper/2022/hash/190dd6a5735822f05646dc27decff19b-Abstract-Datasets_and_Benchmarks.html');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should extract abstract and pdf using aclanthology rule (www.aclweb.org)', async function () {
    this.retries(3);
    const abstractExpected = 'This paper presents the ArabicProcessors team’s deep learning system designed for the NADI 2020 Subtask 1 (country-level dialect identification) and Subtask 2 (province-level dialect identification). We used Arabic-Bert in combination with data augmentation and ensembling methods. Unlabeled data provided by task organizers (10 Million tweets) was split into multiple subparts, to which we applied semi-supervised learning method, and finally ran a specific ensembling process on the resulting models. This system ranked 3rd in Subtask 1 with 23.26% F1-score and 2nd in Subtask 2 with 5.75% F1-score.';
    const pdfExpected = 'https://aclanthology.org/2020.wanlp-1.28.pdf';
    const {abstract, pdf} = await extractAbstract('https://www.aclweb.org/anthology/2020.wanlp-1.28/');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it.skip('should extract abstract and pdf using dlAcmOrgRule rule (dl.acm.org)', async function () {
    this.retries(3);
    const abstractExpected = `n today's information era, every day more and more information is generated and people, on the one hand, have advantages due the increasing support in decision processes and, on the other hand, are experiencing difficulties in the selection of the right data to use. That is, users may leverage on more data but at the same time they may not be able to fully value such data since they lack the necessary knowledge about their provenance and quality. The data quality research area provides quality assessment and improvement methods that can be a valuable support for users that have to deal with the complexity of Web content. In fact, such methods help users to identify the suitability of information for their purposes. Most of the methods and techniques proposed, however, address issues for structured data and/or for defined contexts. Clearly, they cannot be easily used on the Web, where data come from heterogeneous sources and the context of use is most of the times unknown.In this keynote, the need for new assessment techniques is highlighted together with the importance of tracking data provenance as well as the reputation and trustworthiness of the sources. In fact, it is well known that the increase of data volume often corresponds to an increase of value, but to maximize such value the data sources to be used have to carefully analyzed, selected and integrated depending on the specific context of use. The talk discusses the data quality dimensions necessary to analyze different Web data sources and provides a set of illustrative examples that show how to maximize the quality of gathered information.`;
    //const pdfExpected = 'https://dl.acm.org/doi/pdf/10.1145/2740908.2778845'; // pdf link is only available for subscribers
    // eslint-disable-next-line no-unused-vars
    const {abstract, pdf} = await extractAbstract('http://dl.acm.org/citation.cfm?id=2778845');
    assert.equal(abstract,abstractExpected);
    //assert.equal(pdf,pdfExpected);
  });

  it('should return empty using openreview rule (openreview.net)', async function () {
    this.retries(3);
    const abstractExpected = undefined;
    const pdfExpected = undefined;
    const {abstract, pdf} = await extractAbstract('https://openreview.net/forum?id=Rty5g9imm7H');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should return abstract and pdf using ieeeXploreOrgRule rule (ieeexplore.ieee.org)', async function () {
    this.retries(3);
    const abstractExpected = 'Deep Neural Networks (DNNs) have demonstrated remarkable success in computer vision applications. However, achieving sophisticated learning objectives often demands massive amounts of data, leading to challenges related to network management such as memory storage, computational cost, training time, and searching optimal models. Dataset distillation presents a potential solution by creating smaller training sets, but existing methods suffer from high computational costs and lengthy training times. Dataset distillation with distribution matching (DM) offers a viable approach to training synthetic sets with reduced cost and processing time, albeit at the expense of accuracy degradation. In this paper, we propose an improved distribution matching version that can enhance testing accuracy with low computational cost and an acceptable training time. Particularly, we propose to combine representative original image selection with multiple synthetic sample generations for the training with distribution matching. In addition, to increase the matching diversity, perturbation, pre-training with mini-batch, and training model with real data during the synthesis process are applied. Experimental results demonstrate that our method significantly improves distribution matching, achieving nearly equal testing accuracy with reduced learning time compared to the recent state-of-the-art approach of gradient matching.';
    const pdfExpected = 'https://ieeexplore.ieee.org/iel7/10258128/10258147/10258130.pdf';
    const {abstract, pdf} = await extractAbstract('https://ieeexplore.ieee.org/document/10258130');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should return abstract and pdf using iscaSpeechOrgRule rule (isca-archive.org)', async function () {
    this.retries(3);
    const abstractExpected = 'In this paper, we describe a system for recording of mood di aries in the context of an ambient assisted living and intelli gent coaching environment, which ensures privacy by design. The system performs affect recognition in speech features with out recording speech content in any form. We demonstrate re sults of affect recognition models tested on data collected in care-home settings during the SAAM project (Supporting Ac tive Ageing through Multimodal Coaching) using our custom designed audio collection hardware. The proposed system was trained using Bulgarian speech augmented with training data obtained from comparable mood diaries recorded in Scottish English. A degree of transfer learning of Scottish English speech to Bulgarian speech was demonstrated.';
    const pdfExpected = 'https://www.isca-archive.org/interspeech_2022/haider22_interspeech.pdf';
    const {abstract, pdf} = await extractAbstract('https://www.isca-speech.org/archive/interspeech_2022/haider22_interspeech.html'); // redirect to isca-archive.org
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it.skip('should return abstract and pdf using lrecConfOrgRule rule (lrec-conf.org)', async function () {
    this.retries(3);
    const abstractExpected = 'In order to help improve the quality, coverage and performance of automated translation solutions in the context of current and future Connecting Europe Facility (CEF) digital services, the European Language Resource Coordination (ELRC) consortium was set up through a service contract operating under the European Commission’s CEF SMART 2014/1074 programme to initiate a number of actions to support the collection of Language Resources (LRs) within the public sector. The first action consisted in raising awareness in the public sector through the organisation of dedicated events: 2 conferences and 29 country-specific workshops to meet with national or regional/municipal governmental organisations, language competence centres, relevant European institutions and other potential holders of LRs from the public service administrations. In order to gather resources shared by the contributors, the ELRC-SHARE Repository was built up together with services to support the sharing of LRs, such as the ELRC Helpdesk and Intellectual property Rights (IPR) clearance support. All collected LRs should pass a validation process whose guidelines were developed within the project. The collected LRs cover all official EU languages, plus Icelandic and Norwegian.';
    const pdfExpected = 'http://www.lrec-conf.org/proceedings/lrec2018/pdf/1119.pdf';
    const {abstract, pdf} = await extractAbstract('http://www.lrec-conf.org/proceedings/lrec2018/summaries/1119.html');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should return abstract and pdf using ePrintIacrRule rule (eprint.iacr.org)', async function () {
    this.retries(3);
    const abstractExpected = 'The escalation of hazards to safety and hijacking of digital networks are among the strongest perilous difficulties that must be addressed in the present day. Numerous safety procedures were set up to track and recognize any illicit activity on the network\'s infrastructure. IDS are the best way to resist and recognize intrusions on internet connections and digital technologies. To classify network traffic as normal or anomalous, Machine Learning (ML) classifiers are increasingly utilized. An IDS with machine learning increases the accuracy with which security attacks are detected. This paper focuses on intrusion detection systems (IDSs) analysis using ML techniques. IDSs utilizing ML techniques are efficient and precise at identifying network assaults. In data with large dimensional spaces, however, the efficacy of these systems degrades. correspondingly, the case is essential to execute a feasible feature removal technique capable of getting rid of characteristics that have little effect on the classification process. In this paper, we analyze the KDD CUP-\'99\' intrusion detection dataset used for training and validating ML models. Then, we implement ML classifiers such as “Logistic Regression, Decision Tree, K-Nearest Neighbour, Naïve Bayes, Bernoulli Naïve Bayes, Multinomial Naïve Bayes, XG-Boost Classifier, Ada-Boost, Random Forest, SVM, Rocchio classifier, Ridge, Passive-Aggressive classifier, ANN besides Perceptron (PPN), the optimal classifiers are determined by comparing the results of Stochastic Gradient Descent and back-propagation neural networks for IDS”, Conventional categorization indicators, such as "accuracy, precision, recall, and the f1-measure", have been used to evaluate the performance of the ML classification algorithms.';
    const pdfExpected = 'https://eprint.iacr.org/2023/1546.pdf';
    const {abstract, pdf} = await extractAbstract('https://eprint.iacr.org/2023/1546');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should return abstract and pdf using linkSpringerComRule rule (link.springer.com)', async function () {
    this.retries(3);
    const abstractExpected = 'Multi-task learning has been widely studied in machine learning due to its capability to improve the performance of multiple related learning problems. However, few researchers have applied it on the important metric learning problem. In this paper, we propose to couple multiple related metric learning tasks with von Neumann divergence. On one hand, the novel regularized approach extends previous methods from the vector regularization to a general matrix regularization framework; on the other hand and more importantly, by exploiting von Neumann divergence as the regularizer, the new multi-task metric learning has the capability to well preserve the data geometry. This leads to more appropriate propagation of side-information among tasks and provides potential for further improving the performance. We propose the concept of geometry preserving probability (PG) and show that our framework leads to a larger PG in theory. In addition, our formulation proves to be jointly convex and the global optimal solution can be guaranteed. A series of experiments across very different disciplines verify that our proposed algorithm can consistently outperform the current methods.';
    const pdfExpected = 'https://link.springer.com/content/pdf/10.1007/978-3-642-33460-3_47.pdf';
    // redirect to https://link.springer.com/chapter/10.1007/978-3-642-33460-3_47
    const {abstract, pdf} = await extractAbstract('https://doi.org/10.1007/978-3-642-33460-3_47');
    assert.equal(abstract.replace(/\s|\u00A0/g, ' '),abstractExpected.replace(/\s|\u00A0/g, ' ')); // non-breaking space can cause test to fail
    assert.equal(pdf,pdfExpected);
  });

  it('should return abstract using scienceDirect rule (linkinghub.elsevier.com)', async function () {
    this.retries(3);
    const abstractExpected = 'Many of the existing opportunistic networking systems have been designed assuming a small number links per node and have trouble scaling to large numbers of potential concurrent communication partners. In the real world we often find wireless local area networks with large numbers of connected users – in particular in open Wi-Fi networks provided by cities, airports, conferences and other venues. In this paper we build a 50 client opportunistic network in a single Wi-Fi access point and use it to uncover scaling problems and to suggest mechanisms to improve the performance of single segment dissemination. Further, we present an algorithm for breaking down a single dense segment dissemination problem into multiple smaller but identical problems by exploiting resource (e.g., Wi-Fi channel) diversity, and validate our approach via simulations and testbed experiments. The ability to scale to high density network segments creates new, realistic use cases for opportunistic networking applications.';
    const pdfExpected = 'https://www.sciencedirect.com/science/article/pii/S014036641730525X/pdfft?md5=937ab7fd26e98a51fba20e6e4f3bdb15&pid=1-s2.0-S014036641730525X-main.pdf';
    // redirect to https://linkinghub.elsevier.com/retrieve/pii/S014036641730525X
    // and redirected again to https://www.sciencedirect.com/science/article/pii/S014036641730525X
    const {abstract, pdf} = await extractAbstract('https://doi.org/10.1016/j.comcom.2018.03.013');
    assert.equal(abstract.replace(/\s|\u00A0/g, ' '),abstractExpected.replace(/\s|\u00A0/g, ' ')); // non-breaking space can cause test to fail
    assert.ok(pdf === null || pdf === pdfExpected); // pdf not available outside campus
  });

  it.skip('should return abstract and pdf using onlinelibraryWileyComRule rule (onlinelibrary.wiley.com)', async function () {
    const abstractExpected = 'Deep learning techniques are recently being used in fundus image analysis and diabetic retinopathy detection. Microaneurysms are important indicators of diabetic retinopathy progression. The authors introduce a two-stage deep learning approach for microaneurysms segmentation using multiple scales of the input with selective sampling and embedding triplet loss. The proposed approach facilitates a region proposal fully convolutional neural network trained on segmented patches and a patch-wise refinement network for improving the results suggested by the first stage hypothesis. To enhance the discriminative power of the second stage refinement network, the authors use triplet embedding loss with a selective sampling routine that dynamically assigns sampling probabilities to the oversampled class patches. This approach introduces a 23.5 % relative improvement over the vanilla fully convolutional neural network on the Indian Diabetic Retinopathy Image Data set segmentation data set. The proposed segmentation is incorporated in a classification model to solve two downstream tasks for diabetic retinopathy detection and referable diabetic retinopathy detection. The classification tasks are trained on the Kaggle diabetic retinopathy challenge data set and evaluated on the Messidor data. The authors show that adding the segmentation enhances the classification performance and achieves comparable performance to the state-of-the-art models.';
    const pdfExpected = 'https://onlinelibrary.wiley.com/doi/pdf/10.1049/iet-ipr.2019.0804';
    const {abstract, pdf} = await extractAbstract('https://onlinelibrary.wiley.com/doi/10.1049/iet-ipr.2019.0804');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should return abstract and pdf using mdpiComRule rule (www.mdpi.com)', async function () {
    this.retries(3);
    const abstractExpected = 'Face recognition using a single reference image per subject is challenging, above all when referring to a large gallery of subjects. Furthermore, the problem hardness seriously increases when the images are acquired in unconstrained conditions. In this paper we address the challenging Single Sample Per Person (SSPP) problem considering large datasets of images acquired in the wild, thus possibly featuring illumination, pose, face expression, partial occlusions, and low-resolution hurdles. The proposed technique alternates a sparse dictionary learning technique based on the method of optimal direction and the iterative ℓ 0 -norm minimization algorithm called k-LiMapS. It works on robust deep-learned features, provided that the image variability is extended by standard augmentation techniques. Experiments show the effectiveness of our method against the hardness introduced above: first, we report extensive experiments on the unconstrained LFW dataset when referring to large galleries up to 1680 subjects; second, we present experiments on very low-resolution test images up to 8 × 8 pixels; third, tests on the AR dataset are analyzed against specific disguises such as partial occlusions, facial expressions, and illumination problems. In all the three scenarios our method outperforms the state-of-the-art approaches adopting similar configurations.';
    const pdfExpected = 'https://www.mdpi.com/1424-8220/19/1/146/pdf?version=1546516198';
    // redirect to https://www.mdpi.com/1424-8220/19/1/146
    const {abstract, pdf} = await extractAbstract('https://doi.org/10.3390/s19010146');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should return abstract and pdf using ijcaiOrgRule rule (ijcai.org)', async function () {
    this.retries(3);
    const abstractExpected = 'We present a novel geometric deep learning method to compute the acoustic scattering properties of geometric objects. Our learning algorithm uses a point cloud representation of objects to compute the scattering properties and integrates them with ray tracing for interactive sound propagation in dynamic scenes. We use discrete Laplacian-based surface encoders and approximate the neighborhood of each point using a shared multi-layer perceptron. We show that our formulation is permutation invariant and present a neural network that computes the scattering function using spherical harmonics. Our approach can handle objects with arbitrary topologies and deforming models, and takes less than 1ms per object on a commodity GPU. We have analyzed the accuracy and perform validation on thousands of unseen 3D objects and highlight the benefits over other point-based geometric deep learning methods. To the best of our knowledge, this is the first real-time learning algorithm that can approximate the acoustic scattering properties of arbitrary objects with high accuracy.';
    const pdfExpected = 'https://www.ijcai.org/proceedings/2021/0126.pdf';
    // redirect to https://www.ijcai.org/proceedings/2021/126
    const {abstract, pdf} = await extractAbstract('https://doi.org/10.24963/ijcai.2021/126');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it.skip('should return abstract and pdf using general rule (epubs.siam.org)', async function () {
    const abstractExpected = 'This paper presents an active learning strategy for boosting. In this strategy, we construct a novel objective function to unify semi-supervised learning and active learning boosting. Minimization of this objective is achieved through alternating optimization with respect to the classifier ensemble and the queried data set iteratively. Previous semi-supervised learning or active learning methods based on boosting can be viewed as special cases under this framework. More important, we derive an efficient active learning algorithm under this framework, based on a novel query mechanism called query by incremental committee. It does not only save considerable computational cost, but also outperforms conventional active learning methods based on boosting. We report the experimental results on both boosting benchmarks and real-world database, which show the efficiency of our algorithm and verify our theoretical analysis.';
    const pdfExpected = 'https://epubs.siam.org/doi/reader/10.1137/1.9781611972795.105';
    // redirect to https://epubs.siam.org/doi/10.1137/1.9781611972795.105
    const {abstract, pdf} = await extractAbstract('https://doi.org/10.1137/1.9781611972795.105');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it.skip('should return abstract and pdf using dlAcmOrgRule rule (portal.acm.org)', async function () {
    this.retries(3);
    const abstractExpected = 'This study assessed the value of a cursor pointer that allows remote collaborators to point to locations in a partner\'s workspace via a shared video feed. We compared performance with the cursor pointer with that in video-only and side-by-side conditions. Results indicated that participants found the cursor pointer of value for referring to objects and locations in the work environment, but that the pointer did not improve performance time over video-only. We conclude that cursor pointing is valuable for collaboration on physical tasks, but that additional gestural support will be required to make performance using video systems as good as performance working side-by-side.';
    const pdfExpected = 'https://dl.acm.org/doi/pdf/10.1145/765891.765992';
    // redirect to http://portal.acm.org/citation.cfm?doid=765891.765992
    // then redirect to https://dl.acm.org/doi/10.1145/765891.765992
    const {abstract, pdf} = await extractAbstract('https://doi.org/10.1145/765891.765992');
    assert.equal(abstract,abstractExpected);
    assert.ok(pdf === null || pdf === pdfExpected);
  });

  it.skip('should return abstract and pdf using academicOupComRule rule (academic.oup.com)', async function () {
    this.retries(3);
    const abstractExpected = 'Analysis of RNA sequencing (RNA-Seq) data have highlighted the fact that most genes undergo alternative splicing (AS) and that these patterns are tightly regulated. Many of these events are complex, resulting in numerous possible isoforms that quickly become difficult to visualize, interpret and experimentally validate. To address these challenges we developed MAJIQ-SPEL, a web-tool that takes as input local splicing variations (LSVs) quantified from RNA-Seq data and provides users with visualization and quantification of gene isoforms associated with those. Importantly, MAJIQ-SPEL is able to handle both classical (binary) and complex, non-binary, splicing variations. Using a matching primer design algorithm it also suggests to users possible primers for experimental validation by RT-PCR and displays those, along with the matching protein domains affected by the LSV, on UCSC Genome Browser for further downstream analysis.';
    const pdfExpected = 'https://academic.oup.com/bioinformatics/article-pdf/34/2/300/48912940/bioinformatics_34_2_300.pdf';
    // redirect to http://academic.oup.com/bioinformatics/article/34/2/300/4111185
    const {abstract, pdf} = await extractAbstract('https://doi.org/10.1093/bioinformatics/btx565');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it.skip('should return abstract and pdf using iospressComRule rule (iospress.com)', async function () {
    this.retries(3);
    const abstractExpected = 'This paper presents a new software framework, Sampo-UI, for developing user interfaces for semantic portals. The goal is to provide the end-user with multiple application perspectives to Linked Data knowledge graphs, and a two-step usage cycle based on faceted search combined with ready-to-use tooling for data analysis. For the software developer, the Sampo-UI framework makes it possible to create highly customizable, user-friendly, and responsive user interfaces using current state-of-the-art JavaScript libraries and data from SPARQL endpoints, while saving substantial coding effort. Sampo-UI is published on GitHub under the open MIT License and has been utilized in several internal and external projects. The framework has been used thus far in creating six published and five forth-coming portals, mostly related to the Cultural Heritage domain, that have had tens of thousands of end-users on the Web.';
    const pdfExpected = 'https://journals.sagepub.com/doi/reader/10.3233/SW-210428';
    // redirect to https://www.medra.org/servlet/aliasResolver?alias=iospress&doi=10.3233/SW-210428
    // then redirect to https://content.iospress.com/articles/semantic-web/sw210428
    const {abstract, pdf} = await extractAbstract('https://doi.org/10.3233/SW-210428');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it.skip('should return pdf using iospressComRule rule (iospress.com)', async function () {
    this.retries(3);
    const abstractExpected = null;
    const pdfExpected = 'https://journals.sagepub.com/doi/reader/10.3233/JIFS-219322';
    // redirect to https://www.medra.org/servlet/aliasResolver?alias=iospress&doi=10.3233/JIFS-219322
    // then redirect to https://content.iospress.com/articles/journal-of-intelligent-and-fuzzy-systems/ifs219322
    const {abstract, pdf} = await extractAbstract('https://doi.org/10.3233/JIFS-219322');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should return abstract and pdf using general rule (ebooks.iospress.nl)', async function () {
    this.skip();
    this.retries(3);
    const abstractExpected = 'Nursing demands that all care offered to patients is appropriately assessed, delivered and evaluated; the care offered must be up to date and supported by adequately researched published evidence. A basic logic suggests that information and communications technology can help the nurse in maintaining his/her care provision to the highest level through presenting relevant evidence. The nursing need for evidence to support the delivery of care is a global phenomenon. Within the project this is demonstrated by the fact that the project lead is resident in England and the project is being carried out in Singapore with the help of the National University Hospital, the Alice Lee Centre of Nursing Studies and the School of Computing at the National University of Singapore. The project commenced in January 2008, this paper will present the background thinking to the project design and will describe the outcomes which will provide nurses with individual supportive evidence for their practice gleaned from quality assured sources. The project will use information and communications technology to provide the evidence on an individual basis. The paper will outline the four key elements of the project, these being the development of user (professional) profiles; the design and development of an automatic crawler search engine to deliver quality assured evidence sources and software design; there will be some mention of hardware design and maintenance which is the fourth key element. Within the paper, consideration will be given to the added value of the project to the nurses, their patients/clients, the research agenda and the employing organisation: • The drive for information is determined by the nurses in clinical and community practice • Evidence available immediately at the point of intervention with patient/client • No patient information stored within structure • All technology and almost all support software already available • Additional information can flow both ways for quality and activity audits • Identification of areas weak in evidence requiring supportive research will be driven by practice • Immediate dissemination of new generic practices and principles can be delivered to each nurse on syncopation, removing the requirements for paper updates etc. • Process can be transferred across all healthcare clinical professions In conclusion, information will be given on progress to date in terms of technical applicability and user acceptance by the nursing staff. In addition, an insight will be given as to managing a multiprofessional, multi-organisational project from a distance.';
    const pdfExpected = 'https://ebooks.iospress.nl/pdf/doi/10.3233/978-1-60750-024-7-488';
    // redirect to https://www.medra.org/servlet/aliasResolver?alias=iospressISSNISBN&issn=0926-9630&volume=146&spage=488
    // then redirect to https://ebooks.iospress.nl/publication/12383
    const {abstract, pdf} = await extractAbstract('https://doi.org/10.3233/978-1-60750-024-7-488');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should extract abstract using scienceDirect rule', async function () {
    this.retries(3);
    const abstractExpected = 'With the increasing use of research paper search engines, such as CiteSeer, for both literature search and hiring decisions, the accuracy of such systems is of paramount importance. This article employs conditional random fields (CRFs) for the task of extracting various common fields from the headers and citation of research papers. CRFs provide a principled way for incorporating various local features, external lexicon features and globle layout features. The basic theory of CRFs is becoming well-understood, but best-practices for applying them to real-world data requires additional exploration. We make an empirical exploration of several factors, including variations on Gaussian, Laplace and hyperbolic-L1 priors for improved regularization, and several classes of features. Based on CRFs, we further present a novel approach for constraint co-reference information extraction; i.e., improving extraction performance given that we know some citations refer to the same publication. On a standard benchmark dataset, we achieve new state-of-the-art performance, reducing error in average F1 by 36%, and word error rate by 78% in comparison with the previous best SVM results. Accuracy compares even more favorably against HMMs. On four co-reference IE datasets, our system significantly improves extraction performance, with an error rate reduction of 6–14%.';
    const {abstract} = await extractAbstract('https://www.sciencedirect.com/science/article/pii/S0306457305001172');
    assert.equal(abstract,abstractExpected);
  });

  it('should return abstract and pdf using general rule (drops.dagstuhl.de)', async function () {
    this.retries(3);
    const abstractExpected = 'We give a commutative valuations monad Z on the category DCPO of dcpo’s and Scott-continuous functions. Compared to the commutative valuations monads given in [Xiaodong Jia et al., 2021], our new monad Z is larger and it contains all push-forward images of valuations on the unit interval [0, 1] along lower semi-continuous maps. We believe that this new monad will be useful in giving domain-theoretic denotational semantics for statistical programming languages with continuous probabilistic choice.';
    const pdfExpected = 'https://drops.dagstuhl.de/storage/00lipics/lipics-vol211-calco2021/LIPIcs.CALCO.2021.18/LIPIcs.CALCO.2021.18.pdf';
    // redirect to https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.CALCO.2021.18
    const {abstract, pdf} = await extractAbstract('https://doi.org/10.4230/LIPIcs.CALCO.2021.18');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should return abstract and pdf using general rule (proceedings.spiedigitallibrary.org)', async function () {
    this.skip();
    const abstractExpected = 'Region-based active contours are a variational framework for image segmentation. It involves estimating the probability distributions of observed features within each image region. Subsequently, these so-called region descriptors are used to generate forces to move the contour toward real image boundaries. In this paper region descriptors are computed from samples within windows centered on contour pixels and they are named local region descriptors (LRDs). With these descriptors we introduce an equation for contour motion with two terms: growing and competing. This equation yields a novel type of AC that can adjust the behavior of contour pieces to image patches and to the presence of other contours. The quality of the proposed motion model is demonstrated on complex images.';
    const pdfExpected = 'https://www.spiedigitallibrary.org/conference-proceedings-of-spie/7245/72450F/Active-contours-that-grow-and-compete-driven-by-local-region/10.1117/12.805983.pdf';
    // redirect to http://proceedings.spiedigitallibrary.org/proceeding.aspx?doi=10.1117/12.805983
    // then redirect to https://www.spiedigitallibrary.org/conference-proceedings-of-spie/7245/1/Active-contours-that-grow-and-compete-driven-by-local-region/10.1117/12.805983.full
    const {abstract, pdf} = await extractAbstract('https://doi.org/10.1117/12.805983');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it.skip('should return abstract and pdf using worldscientific rule (worldscientific.com)', async function () {
    const abstractExpected = 'Content-based image retrieval has become an essential technique in multimedia data management. However, due to the difficulties and complications involved in the various image processing tasks, a robust semantic representation of image content is still very difficult (if not impossible) to achieve. In this paper, we propose a novel content-based image retrieval approach with relevance feedback using adaptive processing of tree-structure image representation. In our approach, each image is first represented with a quad-tree, which is segmentation free. Then a neural network model with the Back-Propagation Through Structure (BPTS) learning algorithm is employed to learn the tree-structure representation of the image content. This approach that integrates image representation and similarity measure in a single framework is applied to the relevance feedback of the content-based image retrieval. In our approach, an initial ranking of the database images is first carried out based on the similarity between the query image and each of the database images according to global features. The user is then asked to categorize the top retrieved images into similar and dissimilar groups. Finally, the BPTS neural network model is used to learn the user\'s intention for a better retrieval result. This process continues until satisfactory retrieval results are achieved. In the refining process, a fine similarity grading scheme can also be adopted to improve the retrieval performance. Simulations on texture images and scenery pictures have demonstrated promising results which compare favorably with the other relevance feedback methods tested.';
    const pdfExpected = 'https://www.worldscientific.com/doi/reader/10.1142/S0219467803000944';
    // redirect to https://www.worldscientific.com/doi/abs/10.1142/S0219467803000944
    const {abstract, pdf} = await extractAbstract('https://doi.org/10.1142/S0219467803000944');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should return abstract using general rule (www.scitepress.org)', async function () {
    this.skip();
    const abstractExpected = 'The cost of video cameras is decreasing rapidly while their resolution is improving. This makes them useful for a number of transportation applications. In this paper, we present an approach to commodity classification from surveillance videos by utilizing text information of logos on trucks. A new real-world benchmark dataset is collected and annotated accordingly that covers over 4,000 truck images. Our approach is evaluated on video data collected in collaboration with the state transportation entity. Results on this dataset indicate that our proposed approach achieved promising performance. This, along with prior work on trailer classification, can be effectively used for automatically deriving the commodity classification for trucks moving on highways using video collection and processing.';
    const pdfExpected = null;
    // redirect to https://www.scitepress.org/Link.aspx?doi=10.5220/0009393702290236
    const {abstract, pdf} = await extractAbstract('https://doi.org/10.5220/0009393702290236');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should return abstract using tandfonlineComRule rule (www.tandfonline.com)', async function () {
    this.skip();
    const abstractExpected = 'Deep convolutional neural networks (CNNs) have proven to be powerful and flexible tools that advance the state-of-the-art in many fields, e.g. speech recognition, computer vision and medical imaging. Usually deep CNN models employ the logistic (soft-max) loss function in the training process of classification tasks. Recent evidence on a computer vision benchmark data-set indicates that the hinge (SVM) loss might give smaller misclassification errors on the test set compared to the logistic loss (i.e. offer better generality). In this paper, we study and compare four different loss functions for deep CNNs in the context of computer-aided abdominal and mediastinal lymph node detection and diagnosis (CAD) using CT images. Besides the logistic loss, we compare three other CNN losses that have not been previously studied for CAD problems. The experiments confirm that the logistic loss performs the worst among the four losses, and an additional 3% increase in detection rate at 3 false positives/volume can be obtained by just replacing it with Lorenz loss. The free-receiver operating characteristic curves of two of the three loss functions consistently outperform the logistic loss in testing.';
    const pdfExpected = null;
    // redirect to https://www.tandfonline.com/doi/full/10.1080/21681163.2016.1138240
    const {abstract, pdf} = await extractAbstract('https://doi.org/10.1080/21681163.2016.1138240');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it.skip('should return abstract using general rule (direct.mit.edu)', async function () {
    const abstractExpected = 'We propose a new method for detecting changes in Markov network structure between two sets of samples. Instead of naively fitting two Markov network models separately to the two data sets and figuring out their difference, we directly learn the network structure change by estimating the ratio of Markov network models. This density-ratio formulation naturally allows us to introduce sparsity in the network structure change, which highly contributes to enhancing interpretability. Furthermore, computation of the normalization term, a critical bottleneck of the naive approach, can be remarkably mitigated. We also give the dual formulation of the optimization problem, which further reduces the computation cost for large-scale Markov networks. Through experiments, we demonstrate the usefulness of our method.';
    const pdfExpected = 'https://direct.mit.edu/neco/article-pdf/26/6/1169/913165/neco_a_00589.pdf';
    // redirect to https://direct.mit.edu/neco/article/26/6/1169-1197/7970
    // then redirect to https://direct.mit.edu/neco/article-abstract/26/6/1169/7970/Direct-Learning-of-Sparse-Changes-in-Markov
    const {abstract, pdf} = await extractAbstract('https://doi.org/10.1162/NECO_a_00589');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it('should return abstract using jstage rule (www.jstage.jst.go.jp)', async function () {
    this.retries(3);
    const abstractExpected = 'Vector field convolution (VFC) provides a successful external force for an active contour model. However, it fails to extract the complex geometries, especially the deep concavity when the initial contour is set outside the object or the concave region. In this letter, dynamically constrained vector field convolution (DCVFC) external force is proposed to solve this problem. In DCVFC, the indicator function with respect to the evolving contour is introduced to restrain the correlation of external forces generated by different edges, and the forces dynamically generated by complex concave edges gradually make the contour move to the object. On the other hand, traditional vector field, a component of the proposed DCVFC, makes the evolving contour stop at the object boundary. The connections between VFC and DCVFC are also analyzed. DCVFC maintains desirable properties of VFC, such as robustness to initialization. Experimental results demonstrate that DCVFC snake provides a much better segmentation than VFC snake.';
    const pdfExpected = 'https://www.jstage.jst.go.jp/article/transinf/E96.D/11/E96.D_2500/_pdf';
    // redirect to https://www.jstage.jst.go.jp/article/transinf/E96.D/11/E96.D_2500/_article
    const {abstract, pdf} = await extractAbstract('https://doi.org/10.1587/transinf.E96.D.2500');
    assert.equal(abstract,abstractExpected);
    assert.equal(pdf,pdfExpected);
  });

  it.skip('should remove mathjax tags from abstract', async function () {
    this.retries(3);
    const abstractExpected = 'Various applications of molecular communications (MCs) feature an alarm-prompt behavior for which the prevalent Shannon capacity may not be the appropriate performance metric. The identification capacity as an alternative measure for such systems has been motivated and established in the literature. In this paper, we study deterministic K-identification (DKI) for the discrete-time Poisson channel (DTPC) with inter-symbol interference (ISI), where the transmitter is restricted to an average and a peak molecule release rate constraint. Such a channel serves as a model for diffusive MC systems featuring long channel impulse responses and employing molecule-counting receivers. We derive lower and upper bounds on the DKI capacity of the DTPC with ISI when the size of the target message set  $K$  and the number of ISI channel taps  $L$  may grow with the codeword length  $n$ . As a key finding, we establish that for deterministic encoding, assuming that  $K$  and  $L$  both grow sub-linearly in  $n$ , i.e.,  $K = 2^{\kappa \log n}$  and  $L = 2^{l \log n} $  with  $\kappa + 4l \in [0,1)$ , where  $\kappa \in [0,1)$  is the identification target rate and  $l \in [0,1/4) $  is the ISI rate, then the number of different messages that can be reliably identified scales super-exponentially in  $n$ , i.e.,  $\sim 2^{(n\log n)R}$ , where  $R$  is the DKI coding rate. Moreover, since  $l$  and  $\kappa $  must fulfill  $\kappa + 4l \in [0,1)$ , we show that optimizing  $l$  (or equivalently the symbol rate) leads to an effective identification rate [bits/s] that scales sub-linearly with  $n $ . This result is in contrast to the typical transmission rate [bits/s] which is independent of  $n$ .';
    // abstract contains <inline-formula>,<italic> and <tex-math> tags
    const {abstract} = await extractAbstract('https://ieeexplore.ieee.org/document/10416155');
    assert.equal(abstract,abstractExpected);
  });

  it('should return error when url is invalid', async function () {
    this.retries(3);
    const {abstract,pdf,error} = await extractAbstract('https://ieeexplore.ieee.org/non-existing-url');
    assert.equal(abstract,null);
    assert.equal(pdf,null);
    assert.equal(error,'no global metadata');
  });
});
